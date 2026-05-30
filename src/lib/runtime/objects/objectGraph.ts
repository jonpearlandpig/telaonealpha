// Transient operational topology assembly.
//
// Graphs are assembled at runtime from:
//   - Persistent canonical objects (identity + status)
//   - Replay lineage (confirmed event-to-object relationships)
//   - Recent event window (dependency edges from latest events)
//
// Graphs are NOT sovereign persistence layers.
// They are reconstructable at any time from the above inputs.
// Do not persist graph state. Persist operational objects and events only.

import type { CanonicalOperationalObject } from './operationalObjects'
import type { RuntimeEvent } from '../runtimeTypes'

export type ObjectGraphNode = {
  objectId: string
  objectType: string
  label: string
  status: string
  workspaceId: string
  replayConfirmed: boolean
  incomingEdgeIds: string[]    // objectIds of nodes that have edges pointing to this node
  outgoingEdgeIds: string[]    // objectIds this node has edges pointing to
  depth: number                // topological depth — 0 = root (no blockers), higher = deeper in chain
}

export type ObjectGraphEdgeRelation =
  | 'depends-on'        // PROHIBITED — reserved until operational movement events exist
  | 'blocked-by'        // PROHIBITED — reserved until operational movement events exist
  | 'governs'           // structural topology only, weight 0
  | 'confirms'
  | 'informs'
  | 'references'        // cross-entity reference from shared event context
  | 'participates-in'   // entity participates in an operation or thread

export type ObjectGraphEdge = {
  fromId: string
  toId: string
  relation: ObjectGraphEdgeRelation
  sourceEventId: string
  lineageId?: string
  // 0 = structural topology (governs), 1 = soft/informational, 2 = hard block (reserved), 3 = governance-critical (reserved)
  weight: 0 | 1 | 2 | 3
}

export type OperationalObjectGraph = {
  workspaceId: string
  assembledAt: string
  nodes: Map<string, ObjectGraphNode>
  edges: ObjectGraphEdge[]
  rootIds: string[]            // objects with no incoming edges (nothing blocking them)
  leafIds: string[]            // objects with no outgoing edges (nothing they block)
  cycleDetected: boolean
  replayWindowDepth: number    // number of recent events used to assemble this graph
}

export type GraphTraversalResult = {
  path: string[]
  totalWeight: number
  reachable: boolean
}

// Assembles a transient object graph from persistent objects and recent events.
// This is the primary entry point for graph assembly — pure, side-effect free,
// fully reconstructable from the same inputs.
export function assembleObjectGraph(
  objects: CanonicalOperationalObject[],
  recentEvents: RuntimeEvent[],
  workspaceId: string,
): OperationalObjectGraph {
  const nodes = new Map<string, ObjectGraphNode>()
  const edges: ObjectGraphEdge[] = []

  // Seed nodes from persistent objects scoped to this workspace
  for (const obj of objects) {
    if (obj.workspaceId !== workspaceId) continue
    nodes.set(obj.id, {
      objectId: obj.id,
      objectType: obj.objectType,
      label: labelForObject(obj),
      status: obj.status,
      workspaceId: obj.workspaceId,
      replayConfirmed: obj.replayConfirmed,
      incomingEdgeIds: [],
      outgoingEdgeIds: [],
      depth: 0,
    })
  }

  // Build topology edges from confirmed runtime event payload fields.
  // At current maturity: informs, governs (weight 0), references only.
  // depends-on and blocked-by are prohibited until operational movement events exist.
  for (const event of recentEvents) {
    if (event.workspaceId && event.workspaceId !== workspaceId) continue
    const payload = (event.payload ?? {}) as Record<string, unknown>

    // Canonical object IDs use {type}:{rawId} format — nodes are keyed by canonical ID
    const rawEntityId = typeof payload.entityId === 'string' ? payload.entityId : undefined
    const entityNodeId = rawEntityId ? `entity:${rawEntityId}` : undefined
    if (!entityNodeId || !nodes.has(entityNodeId)) continue

    const rawThreadId = typeof payload.threadId === 'string' ? payload.threadId : undefined
    const rawRoutingPlanId = typeof payload.routingPlanId === 'string' ? payload.routingPlanId : undefined
    const linkedEntities = Array.isArray(payload.linkedEntities)
      ? (payload.linkedEntities as unknown[]).filter((id): id is string => typeof id === 'string')
      : []

    // thread → entity: informs (thread provides operational context to entity)
    if (rawThreadId) {
      addEdgeIfValid(edges, nodes, {
        fromId: `thread:${rawThreadId}`,
        toId: entityNodeId,
        relation: 'informs',
        weight: 1,
        sourceEventId: event.id,
        lineageId: event.lineageId,
      })
    }

    // routing → entity: governs (routing structure oversees entity — structural topology, weight 0)
    if (rawRoutingPlanId) {
      addEdgeIfValid(edges, nodes, {
        fromId: `routing:${rawRoutingPlanId}`,
        toId: entityNodeId,
        relation: 'governs',
        weight: 0,
        sourceEventId: event.id,
        lineageId: event.lineageId,
      })
    }

    // entity → linkedEntity: references (cross-entity relationship from shared event context)
    for (const linkedId of linkedEntities) {
      const linkedNodeId = `entity:${linkedId}`
      if (linkedNodeId !== entityNodeId) {
        addEdgeIfValid(edges, nodes, {
          fromId: entityNodeId,
          toId: linkedNodeId,
          relation: 'references',
          weight: 1,
          sourceEventId: event.id,
          lineageId: event.lineageId,
        })
      }
    }
  }

  // Populate adjacency lists from edges
  for (const edge of edges) {
    const fromNode = nodes.get(edge.fromId)
    const toNode = nodes.get(edge.toId)
    if (fromNode && !fromNode.outgoingEdgeIds.includes(edge.toId)) {
      fromNode.outgoingEdgeIds.push(edge.toId)
    }
    if (toNode && !toNode.incomingEdgeIds.includes(edge.fromId)) {
      toNode.incomingEdgeIds.push(edge.fromId)
    }
  }

  // Topological depth pass
  const depths = computeTopologicalDepths(nodes, edges)
  for (const [id, depth] of depths) {
    const node = nodes.get(id)
    if (node) node.depth = depth
  }

  const cycleDetected = hasCycle(nodes)
  const rootIds = [...nodes.values()]
    .filter((n) => n.incomingEdgeIds.length === 0)
    .map((n) => n.objectId)
  const leafIds = [...nodes.values()]
    .filter((n) => n.outgoingEdgeIds.length === 0)
    .map((n) => n.objectId)

  return {
    workspaceId,
    assembledAt: new Date().toISOString(),
    nodes,
    edges,
    rootIds,
    leafIds,
    cycleDetected,
    replayWindowDepth: recentEvents.length,
  }
}

// Returns the full blocking chain for a node — the node itself plus all
// transitive outgoing dependencies (nodes it is blocked by or depends on).
export function getBlockingChain(
  graph: OperationalObjectGraph,
  nodeId: string,
): string[] {
  const chain: string[] = []
  const visited = new Set<string>()

  function walk(current: string) {
    if (visited.has(current)) return
    visited.add(current)
    chain.push(current)
    const node = graph.nodes.get(current)
    for (const dep of node?.outgoingEdgeIds ?? []) {
      walk(dep)
    }
  }

  walk(nodeId)
  return chain
}

// Finds a path between two nodes in the graph.
// Returns the path and total edge weight if reachable.
export function findGraphPath(
  graph: OperationalObjectGraph,
  fromId: string,
  toId: string,
): GraphTraversalResult {
  const visited = new Set<string>()
  const path: string[] = []
  let totalWeight = 0

  function dfs(current: string): boolean {
    if (current === toId) {
      path.push(current)
      return true
    }
    if (visited.has(current)) return false
    visited.add(current)

    const node = graph.nodes.get(current)
    for (const nextId of node?.outgoingEdgeIds ?? []) {
      if (dfs(nextId)) {
        path.unshift(current)
        const edge = graph.edges.find((e) => e.fromId === current && e.toId === nextId)
        totalWeight += edge?.weight ?? 1
        return true
      }
    }
    return false
  }

  const reachable = dfs(fromId)
  return { path, totalWeight, reachable }
}

// Returns the topological depth of a node (0 = root, higher = deeper in dependency chain).
export function getNodeDepth(graph: OperationalObjectGraph, nodeId: string): number {
  return graph.nodes.get(nodeId)?.depth ?? 0
}

// Returns the total blocking weight for a node — sum of all outgoing edge weights.
// Higher weight = more operationally critical dependency pressure.
export function getNodeBlockingWeight(
  graph: OperationalObjectGraph,
  nodeId: string,
): number {
  const node = graph.nodes.get(nodeId)
  if (!node) return 0
  return node.outgoingEdgeIds.reduce((sum, depId) => {
    const edge = graph.edges.find((e) => e.fromId === nodeId && e.toId === depId)
    return sum + (edge?.weight ?? 1)
  }, 0)
}

// Returns graph topology summary counts — useful for projection generation.
export function summarizeGraph(graph: OperationalObjectGraph) {
  const nodes = [...graph.nodes.values()]
  return {
    totalNodes: nodes.length,
    confirmedNodes: nodes.filter((n) => n.replayConfirmed).length,
    unconfirmedNodes: nodes.filter((n) => !n.replayConfirmed).length,
    rootCount: graph.rootIds.length,
    leafCount: graph.leafIds.length,
    totalEdges: graph.edges.length,
    blockingEdges: graph.edges.filter((e) => e.relation === 'blocked-by').length,
    governanceEdges: graph.edges.filter((e) => e.relation === 'governs').length,
    cycleDetected: graph.cycleDetected,
    maxDepth: Math.max(0, ...nodes.map((n) => n.depth)),
    replayWindowDepth: graph.replayWindowDepth,
  }
}

// — Private helpers —

function labelForObject(obj: CanonicalOperationalObject): string {
  return String(obj.payload.title ?? obj.payload.name ?? obj.id)
}

function addEdgeIfValid(
  edges: ObjectGraphEdge[],
  nodes: Map<string, ObjectGraphNode>,
  input: {
    fromId: string | undefined
    toId: string | undefined
    relation: ObjectGraphEdgeRelation
    weight: 0 | 1 | 2 | 3
    sourceEventId: string
    lineageId?: string
  },
) {
  if (!input.fromId || !input.toId) return
  if (!nodes.has(input.fromId) || !nodes.has(input.toId)) return
  if (input.fromId === input.toId) return

  const duplicate = edges.some(
    (e) => e.fromId === input.fromId && e.toId === input.toId && e.relation === input.relation,
  )
  if (duplicate) return

  edges.push({
    fromId: input.fromId,
    toId: input.toId,
    relation: input.relation,
    weight: input.weight,
    sourceEventId: input.sourceEventId,
    lineageId: input.lineageId,
  })
}

function computeTopologicalDepths(
  nodes: Map<string, ObjectGraphNode>,
  edges: ObjectGraphEdge[],
): Map<string, number> {
  const depths = new Map<string, number>()
  for (const id of nodes.keys()) depths.set(id, 0)

  // Bellman-Ford style relaxation — safe for sparse directed graphs
  const nodeCount = nodes.size
  for (let pass = 0; pass < nodeCount; pass++) {
    let changed = false
    for (const edge of edges) {
      const fromDepth = depths.get(edge.fromId) ?? 0
      const toDepth = depths.get(edge.toId) ?? 0
      if (fromDepth >= toDepth) {
        depths.set(edge.toId, fromDepth + 1)
        changed = true
      }
    }
    if (!changed) break
  }

  return depths
}

function hasCycle(nodes: Map<string, ObjectGraphNode>): boolean {
  const visited = new Set<string>()
  const onStack = new Set<string>()

  function dfs(id: string): boolean {
    if (onStack.has(id)) return true
    if (visited.has(id)) return false
    visited.add(id)
    onStack.add(id)
    const node = nodes.get(id)
    for (const dep of node?.outgoingEdgeIds ?? []) {
      if (dfs(dep)) return true
    }
    onStack.delete(id)
    return false
  }

  for (const id of nodes.keys()) {
    if (dfs(id)) return true
  }
  return false
}
