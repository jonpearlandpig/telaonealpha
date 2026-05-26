// Canonical pressure, status, and lifecycle classifier for operational objects.
//
// This is the single source of classification truth for the objects layer.
// All pressure signals, operational status derivation, and lifecycle state
// must derive from this module in Phase 4+.
//
// Classification is driven by:
//   - Object's own state (status, replayConfirmed)
//   - Graph topology (blocking chain depth, direct blocker count, edge weights)
//
// Classification is NOT driven by:
//   - Event text pattern matching
//   - Notion field values
//   - UI-layer heuristics
//
// Replaces (in Phase 4):
//   - runtimeContinuity.ts::deriveUnresolvedFromEvent (text-pattern pressure)
//   - runtimeContinuity.ts::synthesizeOperationalStateFromEvent (ingest-layer cognition)
//   - showtela/pressure.ts (Notion-based pressure)

import type { CanonicalOperationalObject } from './operationalObjects'
import type { OperationalObjectGraph } from './objectGraph'
import { getBlockingChain, getNodeBlockingWeight } from './objectGraph'

// Pressure levels use different vocabulary from the legacy PressureLevel type
// to prevent silent coupling with the Notion/UI pressure system.
export type ObjectPressureLevel = 'calm' | 'low' | 'medium' | 'high' | 'critical'

export type ObjectLifecycleState =
  | 'forming'      // created but not yet replay-confirmed
  | 'active'       // replay-confirmed, operationally live
  | 'blocked'      // has unresolved blockers in the dependency chain
  | 'escalated'    // governance escalation is active
  | 'resolving'    // actively being resolved (movement in progress)
  | 'resolved'     // no active pressure, dependency chain clear
  | 'archived'     // operationally inactive, removed from live consideration

export type ObjectOperationalStatus =
  | 'AWAITING_COMMITMENT'   // not yet confirmed or dependencies not yet assessed
  | 'ACTIVELY_MOVING'       // confirmed, pressure present, forward movement happening
  | 'READY_TO_ADVANCE'      // confirmed, no blockers, next action is clear
  | 'UNRESOLVED_DEPENDENCY' // blocked by unresolved dependency chain
  | 'GOVERNANCE_BLOCKED'    // blocked by governance state
  | 'ESCALATION_RISK'       // escalation is active or imminent
  | 'STALE_PRESSURE'        // pressure exists but no recent movement
  | 'CALM'                  // no active pressure, operationally stable

export type ObjectClassification = {
  objectId: string
  pressure: ObjectPressureLevel
  operationalStatus: ObjectOperationalStatus
  lifecycle: ObjectLifecycleState
  // 0–100 composite priority score — higher = more operationally urgent
  priority: number
  blockingChainLength: number
  directBlockerCount: number
  blockingWeight: number              // sum of edge weights in the blocking chain
  isReplayConfirmed: boolean
  classifiedAt: string
  classificationBasis:
    | 'graph-topology'     // classification driven by graph structure
    | 'lifecycle-state'    // classification driven by object's own lifecycle
    | 'replay-confirmed'   // object is confirmed with no graph pressure
    | 'unconfirmed'        // object not yet in the graph
}

export type ClassificationSummary = {
  workspaceId: string
  totalObjects: number
  confirmedObjects: number
  criticalCount: number
  highCount: number
  mediumCount: number
  lowCount: number
  calmCount: number
  blockedCount: number
  escalatedCount: number
  movingCount: number
  readyCount: number
  classifiedAt: string
}

// Classifies a single operational object against the assembled graph.
// If the object has no node in the graph, classification falls back to lifecycle state alone.
export function classifyObject(
  object: CanonicalOperationalObject,
  graph: OperationalObjectGraph,
): ObjectClassification {
  const now = new Date().toISOString()
  const node = graph.nodes.get(object.id)

  if (!node) {
    return classifyWithoutGraph(object, now)
  }

  const blockingChain = getBlockingChain(graph, object.id)
  const blockingChainLength = blockingChain.length - 1  // exclude self
  const blockingWeight = getNodeBlockingWeight(graph, object.id)

  const directBlockerCount = node.outgoingEdgeIds.filter((depId) =>
    graph.edges.some(
      (e) => e.fromId === object.id && e.toId === depId &&
             (e.relation === 'blocked-by' || e.relation === 'governs'),
    ),
  ).length

  const pressure = derivePressure(object, directBlockerCount, blockingChainLength, blockingWeight)
  const lifecycle = deriveLifecycle(object, pressure, directBlockerCount)
  const operationalStatus = deriveOperationalStatus(object, lifecycle, pressure, node)
  const priority = derivePriority(pressure, blockingChainLength, blockingWeight, object)

  const basis: ObjectClassification['classificationBasis'] =
    blockingChainLength > 0 ? 'graph-topology' :
    object.replayConfirmed ? 'replay-confirmed' :
    'lifecycle-state'

  return {
    objectId: object.id,
    pressure,
    operationalStatus,
    lifecycle,
    priority,
    blockingChainLength,
    directBlockerCount,
    blockingWeight,
    isReplayConfirmed: object.replayConfirmed,
    classifiedAt: now,
    classificationBasis: basis,
  }
}

// Classifies the full object set in one pass.
// Returns a map of objectId → classification.
export function classifyObjectSet(
  objects: CanonicalOperationalObject[],
  graph: OperationalObjectGraph,
): Map<string, ObjectClassification> {
  const result = new Map<string, ObjectClassification>()
  for (const obj of objects) {
    result.set(obj.id, classifyObject(obj, graph))
  }
  return result
}

// Returns objects with the highest priority, sorted descending.
export function getHighestPriorityObjects(
  classifications: Map<string, ObjectClassification>,
  limit = 12,
): ObjectClassification[] {
  return [...classifications.values()]
    .sort((a, b) => b.priority - a.priority || pressureRank(b.pressure) - pressureRank(a.pressure))
    .slice(0, limit)
}

// Returns all objects in a blocked or escalated state.
export function getBlockedObjects(
  classifications: Map<string, ObjectClassification>,
): ObjectClassification[] {
  return [...classifications.values()].filter(
    (c) =>
      c.operationalStatus === 'GOVERNANCE_BLOCKED' ||
      c.operationalStatus === 'UNRESOLVED_DEPENDENCY' ||
      c.lifecycle === 'blocked' ||
      c.lifecycle === 'escalated',
  )
}

// Returns all objects with active forward movement.
export function getActivelyMovingObjects(
  classifications: Map<string, ObjectClassification>,
): ObjectClassification[] {
  return [...classifications.values()].filter(
    (c) =>
      c.operationalStatus === 'ACTIVELY_MOVING' ||
      c.operationalStatus === 'READY_TO_ADVANCE',
  )
}

// Returns a workspace-level classification summary.
export function summarizeClassifications(
  classifications: Map<string, ObjectClassification>,
  workspaceId: string,
): ClassificationSummary {
  const all = [...classifications.values()]
  return {
    workspaceId,
    totalObjects: all.length,
    confirmedObjects: all.filter((c) => c.isReplayConfirmed).length,
    criticalCount: all.filter((c) => c.pressure === 'critical').length,
    highCount: all.filter((c) => c.pressure === 'high').length,
    mediumCount: all.filter((c) => c.pressure === 'medium').length,
    lowCount: all.filter((c) => c.pressure === 'low').length,
    calmCount: all.filter((c) => c.pressure === 'calm').length,
    blockedCount: getBlockedObjects(classifications).length,
    escalatedCount: all.filter((c) => c.lifecycle === 'escalated').length,
    movingCount: getActivelyMovingObjects(classifications).length,
    readyCount: all.filter((c) => c.operationalStatus === 'READY_TO_ADVANCE').length,
    classifiedAt: new Date().toISOString(),
  }
}

// — Private derivation functions —

function classifyWithoutGraph(
  object: CanonicalOperationalObject,
  now: string,
): ObjectClassification {
  const lifecycle: ObjectLifecycleState = object.replayConfirmed ? 'active' : 'forming'
  return {
    objectId: object.id,
    pressure: object.replayConfirmed ? 'low' : 'calm',
    operationalStatus: 'AWAITING_COMMITMENT',
    lifecycle,
    priority: 0,
    blockingChainLength: 0,
    directBlockerCount: 0,
    blockingWeight: 0,
    isReplayConfirmed: object.replayConfirmed,
    classifiedAt: now,
    classificationBasis: object.replayConfirmed ? 'lifecycle-state' : 'unconfirmed',
  }
}

function derivePressure(
  object: CanonicalOperationalObject,
  directBlockerCount: number,
  chainLength: number,
  blockingWeight: number,
): ObjectPressureLevel {
  if (object.status === 'governance-blocked' || blockingWeight >= 6) return 'critical'
  if (object.status === 'escalated' || directBlockerCount >= 2 || chainLength >= 4) return 'high'
  if (directBlockerCount === 1 || chainLength >= 2 || blockingWeight >= 2) return 'medium'
  if (chainLength === 1 || object.status === 'pending') return 'low'
  return 'calm'
}

function deriveLifecycle(
  object: CanonicalOperationalObject,
  pressure: ObjectPressureLevel,
  directBlockerCount: number,
): ObjectLifecycleState {
  if (!object.replayConfirmed) return 'forming'
  if (object.status === 'archived') return 'archived'
  if (object.status === 'resolved') return 'resolved'
  if (object.status === 'escalated') return 'escalated'
  if (object.status === 'governance-blocked' || directBlockerCount > 0) return 'blocked'
  if (pressure === 'calm') return 'active'
  return 'active'
}

function deriveOperationalStatus(
  object: CanonicalOperationalObject,
  lifecycle: ObjectLifecycleState,
  pressure: ObjectPressureLevel,
  node: { depth: number; outgoingEdgeIds: string[]; incomingEdgeIds: string[] },
): ObjectOperationalStatus {
  if (lifecycle === 'forming') return 'AWAITING_COMMITMENT'
  if (lifecycle === 'archived' || lifecycle === 'resolved') return 'CALM'
  if (lifecycle === 'escalated') return 'ESCALATION_RISK'
  if (lifecycle === 'blocked') {
    return object.status === 'governance-blocked' ? 'GOVERNANCE_BLOCKED' : 'UNRESOLVED_DEPENDENCY'
  }

  // Active objects: derive from pressure and graph position
  if (node.outgoingEdgeIds.length === 0) {
    // Leaf node — nothing blocking it
    if (pressure === 'calm' || pressure === 'low') return 'READY_TO_ADVANCE'
    return 'ACTIVELY_MOVING'
  }

  if (pressure === 'high' || pressure === 'critical') return 'ESCALATION_RISK'
  if (pressure === 'medium') return 'ACTIVELY_MOVING'
  if (pressure === 'low') return 'READY_TO_ADVANCE'
  return 'CALM'
}

function derivePriority(
  pressure: ObjectPressureLevel,
  chainLength: number,
  blockingWeight: number,
  object: CanonicalOperationalObject,
): number {
  const pressureScore = pressureRank(pressure) * 20       // 0–80
  const chainScore = Math.min(chainLength * 4, 20)        // 0–20 cap
  const weightScore = Math.min(blockingWeight * 3, 15)    // 0–15 cap
  const confirmationBonus = object.replayConfirmed ? 3 : 0
  return Math.min(100, pressureScore + chainScore + weightScore + confirmationBonus)
}

export function pressureRank(pressure: ObjectPressureLevel): number {
  return { critical: 4, high: 3, medium: 2, low: 1, calm: 0 }[pressure] ?? 0
}
