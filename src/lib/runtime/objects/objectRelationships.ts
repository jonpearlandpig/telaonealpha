// Entity-to-object relationship mapping.
//
// Provides reverse lookup and relationship traversal across the operational object graph.
// Relationships are derived from persistent object state and assembled graph topology.
// All functions are pure — no I/O.

import type { CanonicalOperationalObject } from './operationalObjects'
import type { OperationalObjectGraph } from './objectGraph'

export type ObjectRelationshipKind =
  | 'entity-anchor'     // object is anchored to a named entity (person, venue, etc.)
  | 'operation-anchor'  // object is anchored to a specific operation
  | 'thread-anchor'     // object is anchored to a continuity thread
  | 'lineage-chain'     // object shares a lineage chain with another object
  | 'governance-link'   // object is governed by another object
  | 'confirmation-link' // object has been confirmed by another object

export type ObjectRelationship = {
  fromObjectId: string
  toObjectId: string
  kind: ObjectRelationshipKind
  entityId?: string      // named entity involved in this relationship
  threadId?: string      // thread anchor if kind === 'thread-anchor'
  lineageId?: string     // shared lineage ID if kind === 'lineage-chain'
  confirmedByReplay: boolean
}

// Index built from persistent objects — allows O(1) lookup by entity/thread/lineage/operation.
export type EntityObjectIndex = {
  byEntity: Map<string, string[]>      // entityId → objectIds
  byThread: Map<string, string[]>      // threadId → objectIds
  byLineage: Map<string, string[]>     // lineageId → objectIds
  byOperation: Map<string, string[]>  // operationRef → objectIds
}

// Builds a reverse lookup index from the persistent object set.
// Should be rebuilt after any reconcileObjectSet call.
export function buildRelationshipIndex(
  objects: CanonicalOperationalObject[],
): EntityObjectIndex {
  const byEntity = new Map<string, string[]>()
  const byThread = new Map<string, string[]>()
  const byLineage = new Map<string, string[]>()
  const byOperation = new Map<string, string[]>()

  for (const obj of objects) {
    const entityId = typeof obj.payload.entityId === 'string' ? obj.payload.entityId : undefined
    const threadId = typeof obj.payload.threadId === 'string' ? obj.payload.threadId : undefined
    const operationRef = typeof obj.payload.operationRef === 'string' ? obj.payload.operationRef : undefined

    if (entityId) addToIndex(byEntity, entityId, obj.id)
    if (threadId) addToIndex(byThread, threadId, obj.id)
    if (obj.lineageId) addToIndex(byLineage, obj.lineageId, obj.id)
    if (operationRef) addToIndex(byOperation, operationRef, obj.id)
  }

  return { byEntity, byThread, byLineage, byOperation }
}

// Returns all canonical objects anchored to a specific named entity.
export function findObjectsByEntity(
  entityId: string,
  index: EntityObjectIndex,
  objects: CanonicalOperationalObject[],
): CanonicalOperationalObject[] {
  const ids = new Set(index.byEntity.get(entityId) ?? [])
  return objects.filter((o) => ids.has(o.id))
}

// Returns all canonical objects anchored to a specific continuity thread.
export function findObjectsByThread(
  threadId: string,
  index: EntityObjectIndex,
  objects: CanonicalOperationalObject[],
): CanonicalOperationalObject[] {
  const ids = new Set(index.byThread.get(threadId) ?? [])
  return objects.filter((o) => ids.has(o.id))
}

// Returns all canonical objects sharing a specific lineage chain.
export function findObjectsByLineage(
  lineageId: string,
  index: EntityObjectIndex,
  objects: CanonicalOperationalObject[],
): CanonicalOperationalObject[] {
  const ids = new Set(index.byLineage.get(lineageId) ?? [])
  return objects.filter((o) => ids.has(o.id))
}

// Returns all canonical objects anchored to a specific operation reference.
export function findObjectsByOperation(
  operationRef: string,
  index: EntityObjectIndex,
  objects: CanonicalOperationalObject[],
): CanonicalOperationalObject[] {
  const ids = new Set(index.byOperation.get(operationRef) ?? [])
  return objects.filter((o) => ids.has(o.id))
}

// Builds the full relationship set for a given object set and assembled graph.
// Combines graph-topology edges with lineage chain relationships from the index.
export function buildObjectRelationships(
  objects: CanonicalOperationalObject[],
  graph: OperationalObjectGraph,
): ObjectRelationship[] {
  const relationships: ObjectRelationship[] = []
  const objectById = new Map(objects.map((o) => [o.id, o]))

  // Graph topology edges → typed relationships
  for (const edge of graph.edges) {
    const fromObj = objectById.get(edge.fromId)
    const toObj = objectById.get(edge.toId)
    if (!fromObj || !toObj) continue

    const kind: ObjectRelationshipKind =
      edge.relation === 'governs' ? 'governance-link' :
      edge.relation === 'confirms' ? 'confirmation-link' :
      'lineage-chain'

    relationships.push({
      fromObjectId: edge.fromId,
      toObjectId: edge.toId,
      kind,
      lineageId: edge.lineageId,
      confirmedByReplay: fromObj.replayConfirmed && toObj.replayConfirmed,
    })
  }

  // Shared lineage chain relationships (not captured by graph edges)
  const index = buildRelationshipIndex(objects)
  for (const [lineageId, ids] of index.byLineage) {
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const fromObj = objectById.get(ids[i])
        const toObj = objectById.get(ids[j])
        if (!fromObj || !toObj) continue

        // Skip if this pair already has a relationship from graph topology
        const alreadyLinked = relationships.some(
          (r) => (r.fromObjectId === ids[i] && r.toObjectId === ids[j]) ||
                 (r.fromObjectId === ids[j] && r.toObjectId === ids[i]),
        )
        if (alreadyLinked) continue

        relationships.push({
          fromObjectId: ids[i],
          toObjectId: ids[j],
          kind: 'lineage-chain',
          lineageId,
          confirmedByReplay: fromObj.replayConfirmed && toObj.replayConfirmed,
        })
      }
    }
  }

  return relationships
}

// Returns all ancestor object IDs for a given node (objects that have paths TO this node).
// Ancestors are nodes that depend on or block this node.
export function getObjectAncestors(
  objectId: string,
  graph: OperationalObjectGraph,
): string[] {
  const ancestors: string[] = []
  const visited = new Set<string>()

  function walk(current: string) {
    const node = graph.nodes.get(current)
    for (const incoming of node?.incomingEdgeIds ?? []) {
      if (!visited.has(incoming)) {
        visited.add(incoming)
        ancestors.push(incoming)
        walk(incoming)
      }
    }
  }

  walk(objectId)
  return ancestors
}

// Returns all descendant object IDs for a given node (objects this node has paths TO).
// Descendants are nodes that this node blocks or depends on.
export function getObjectDescendants(
  objectId: string,
  graph: OperationalObjectGraph,
): string[] {
  const descendants: string[] = []
  const visited = new Set<string>()

  function walk(current: string) {
    const node = graph.nodes.get(current)
    for (const outgoing of node?.outgoingEdgeIds ?? []) {
      if (!visited.has(outgoing)) {
        visited.add(outgoing)
        descendants.push(outgoing)
        walk(outgoing)
      }
    }
  }

  walk(objectId)
  return descendants
}

// Returns all objects directly related to the given entity ID — across all relationship kinds.
export function getRelatedObjectsForEntity(
  entityId: string,
  index: EntityObjectIndex,
  objects: CanonicalOperationalObject[],
): CanonicalOperationalObject[] {
  const relatedIds = new Set<string>([
    ...(index.byEntity.get(entityId) ?? []),
    ...(index.byThread.get(entityId) ?? []),
  ])
  return objects.filter((o) => relatedIds.has(o.id))
}

// — Private helpers —

function addToIndex(index: Map<string, string[]>, key: string, objectId: string) {
  const existing = index.get(key)
  if (!existing) {
    index.set(key, [objectId])
  } else if (!existing.includes(objectId)) {
    existing.push(objectId)
  }
}
