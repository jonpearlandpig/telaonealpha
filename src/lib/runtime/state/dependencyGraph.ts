import type { OperationalObject } from '../operationalState'
import type { RuntimeEvent } from '../runtimeTypes'
import type { DependencyEdge, DependencyGraph, DependencyNode, DependencyPressure } from './model'

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

function ensureNode(nodes: Record<string, DependencyNode>, node: DependencyNode) {
  const existing = nodes[node.id]
  if (!existing) {
    nodes[node.id] = node
    return
  }

  nodes[node.id] = {
    ...existing,
    label: existing.label || node.label,
    status: node.status || existing.status,
    sourceEventIds: Array.from(new Set([...existing.sourceEventIds, ...node.sourceEventIds])),
  }
}

function pushEdge(edges: DependencyEdge[], edge: DependencyEdge) {
  if (edges.some((current) => current.from === edge.from && current.to === edge.to && current.relation === edge.relation)) {
    return
  }
  edges.push(edge)
}

export function buildDependencyGraph(input: {
  recentEvents: RuntimeEvent[]
  operationalObjects: OperationalObject[]
  unresolvedIds: string[]
}): DependencyGraph {
  const nodes: Record<string, DependencyNode> = {}
  const edges: DependencyEdge[] = []

  for (const unresolvedId of input.unresolvedIds) {
    ensureNode(nodes, {
      id: unresolvedId,
      label: unresolvedId,
      kind: 'unresolved',
      status: 'unresolved',
      sourceEventIds: [],
    })
  }

  for (const object of input.operationalObjects) {
    ensureNode(nodes, {
      id: object.id,
      label: String(object.payload.title ?? object.payload.name ?? object.id),
      kind: object.objectType === 'continuity-thread' ? 'thread' : 'object',
      status: object.status,
      sourceEventIds: [],
    })
  }

  for (const event of input.recentEvents) {
    const payload = (event.payload ?? {}) as Record<string, unknown>
    const eventNodeId = `event:${event.id}`
    ensureNode(nodes, {
      id: eventNodeId,
      label: stringValue(payload.title) ?? stringValue(payload.summary) ?? event.type,
      kind: 'event',
      status: event.executionState,
      sourceEventIds: [event.id],
    })

    const threadId = stringValue(payload.threadId)
    if (threadId) {
      ensureNode(nodes, {
        id: threadId,
        label: threadId,
        kind: 'thread',
        status: 'active',
        sourceEventIds: [event.id],
      })
      pushEdge(edges, { from: threadId, to: eventNodeId, relation: 'informs', sourceEventIds: [event.id] })
    }

    const entityIds = [
      stringValue(payload.entityId),
      ...stringList(payload.linkedEntities),
      ...stringList(payload.projectRefs),
    ].filter(Boolean) as string[]

    for (const entityId of entityIds) {
      ensureNode(nodes, {
        id: entityId,
        label: entityId,
        kind: entityId.startsWith('project:') ? 'project' : 'entity',
        status: event.governanceState,
        sourceEventIds: [event.id],
      })
      pushEdge(edges, { from: entityId, to: eventNodeId, relation: 'informs', sourceEventIds: [event.id] })
    }

    const sourceId = stringValue(payload.unresolvedId) ?? entityIds[0] ?? threadId ?? eventNodeId
    const blockers = [
      stringValue(payload.blockedBy),
      stringValue(payload.waitingOn),
      ...stringList(payload.unresolvedDependencies),
      ...stringList(payload.dependsOn),
    ].filter(Boolean) as string[]

    for (const blocker of blockers) {
      ensureNode(nodes, {
        id: blocker,
        label: blocker,
        kind: blocker.startsWith('event:') ? 'event' : blocker.startsWith('project:') ? 'project' : 'external',
        status: 'blocking',
        sourceEventIds: [event.id],
      })
      pushEdge(edges, { from: sourceId, to: blocker, relation: 'blocked-by', sourceEventIds: [event.id] })
    }

    if (event.governanceState === 'blocked' || event.governanceState === 'pending') {
      const governanceNodeId = `governance:${event.id}`
      ensureNode(nodes, {
        id: governanceNodeId,
        label: `${event.type} governance`,
        kind: 'external',
        status: event.governanceState,
        sourceEventIds: [event.id],
      })
      pushEdge(edges, { from: sourceId, to: governanceNodeId, relation: 'governed-by', sourceEventIds: [event.id] })
    }
  }

  return { nodes, edges }
}

export function findBlockingDependencies(graph: DependencyGraph, nodeId: string): DependencyNode[] {
  const blockerIds = graph.edges
    .filter((edge) => edge.from === nodeId && (edge.relation === 'blocked-by' || edge.relation === 'waiting-on' || edge.relation === 'depends-on' || edge.relation === 'governed-by'))
    .map((edge) => edge.to)

  return blockerIds.map((id) => graph.nodes[id]).filter(Boolean)
}

export function findDependencyChains(graph: DependencyGraph, startNodeId?: string): string[][] {
  const roots = startNodeId
    ? [startNodeId]
    : Object.keys(graph.nodes).filter((nodeId) =>
        graph.edges.some((edge) => edge.from === nodeId && (edge.relation === 'blocked-by' || edge.relation === 'governed-by')),
      )

  const chains: string[][] = []

  for (const root of roots) {
    walk(root, [root])
  }

  return chains

  function walk(nodeId: string, path: string[]) {
    const nextEdges = graph.edges.filter((edge) => edge.from === nodeId && (edge.relation === 'blocked-by' || edge.relation === 'governed-by'))
    if (nextEdges.length === 0) {
      chains.push(path)
      return
    }

    for (const edge of nextEdges) {
      if (path.includes(edge.to)) {
        chains.push(path)
        continue
      }
      walk(edge.to, [...path, edge.to])
    }
  }
}

export function calculateDependencyPressure(graph: DependencyGraph, nodeId: string): DependencyPressure {
  const chains = findDependencyChains(graph, nodeId)
  const directBlockers = findBlockingDependencies(graph, nodeId).length
  const chainDepth = Math.max(0, ...chains.map((chain) => chain.length - 1))
  const escalations = graph.edges.filter((edge) => edge.from === nodeId && edge.relation === 'governed-by').length
  const pendingGovernance = findBlockingDependencies(graph, nodeId)
    .filter((node) => node.status === 'pending' || node.status === 'blocked')
    .length

  return {
    nodeId,
    directBlockers,
    chainDepth,
    escalations,
    pendingGovernance,
    score: directBlockers * 3 + chainDepth * 2 + escalations * 2 + pendingGovernance,
  }
}
