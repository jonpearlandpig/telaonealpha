import crypto from 'crypto'

import type { OperationalObject } from '../operationalState'
import type { ReconstructedOperationalState, RuntimeEvent } from '../runtimeTypes'
import { INFRASTRUCTURE_EVENT_TYPES } from '../replay/derivedArtifacts'
import { buildDependencyGraph, calculateDependencyPressure, findDependencyChains } from './dependencyGraph'
import { explainState } from './explainState'
import { inferHeuristicState } from './heuristics'
import {
  initialLifecycleState,
} from './stateLifecycle'
import {
  OPERATIONAL_STATE_DERIVATION_VERSION,
  type DependencyGraph,
  type OperationalStateRecord,
} from './model'

function titleForObject(object: OperationalObject) {
  return String(object.payload.title ?? object.payload.name ?? object.id)
}

function eventSummary(event: RuntimeEvent) {
  const payload = (event.payload ?? {}) as Record<string, unknown>
  return String(payload.title ?? payload.summary ?? payload.name ?? event.type)
}

function lineageIdsFor(item: { lineageId?: string; payload?: Record<string, unknown> }) {
  const ids = new Set<string>()
  if (item.lineageId) ids.add(item.lineageId)
  const payloadLineageId = item.payload && typeof item.payload.lineageId === 'string' ? item.payload.lineageId : undefined
  if (payloadLineageId) ids.add(payloadLineageId)
  return [...ids]
}

function recordFromObject(
  object: OperationalObject,
  graph: DependencyGraph,
  now: string,
): OperationalStateRecord {
  const pressure = calculateDependencyPressure(graph, object.id)
  const inferred = inferHeuristicState({
    label: `${titleForObject(object)} ${object.status}`,
    directBlockers: pressure.directBlockers,
    chainDepth: pressure.chainDepth,
    pendingGovernance: pressure.pendingGovernance,
    escalations: pressure.escalations,
  })
  const dependencyChain = findDependencyChains(graph, object.id)[0] ?? [object.id]

  const state: OperationalStateRecord = {
    stateId: `state:${object.id}:${crypto.randomUUID().slice(0, 8)}`,
    entityId: object.id,
    entityType: object.objectType,
    entityName: titleForObject(object),
    stateCode: inferred.code,
    stateLabel: `${inferred.emoji} ${titleForObject(object)}`,
    stateEmoji: inferred.emoji,
    severity: inferred.severity,
    lifecycle: initialLifecycleState(),
    triggerDetail: `${pressure.directBlockers} blockers, depth ${pressure.chainDepth}, governance ${pressure.pendingGovernance}`,
    resolutionAction: pressure.directBlockers > 0 ? 'Clear the active dependency chain' : 'Advance the next operational move',
    resolutionOwner: 'Jon Hartman',
    dependencyIds: dependencyChain.slice(1),
    dependencyChain,
    reasoningChain: [
      `object:${object.objectType}`,
      `status:${object.status}`,
      `pressure:${pressure.score}`,
    ],
    derivationSource: pressure.score > 0 ? 'dependency-graph' : 'heuristic',
    sourceEventIds: graph.nodes[object.id]?.sourceEventIds ?? [],
    lineageIds: lineageIdsFor(object),
    derivedAt: now,
    derivationVersion: OPERATIONAL_STATE_DERIVATION_VERSION,
  }

  state.explanation = explainState(state).explanation
  return state
}

function recordFromEvent(event: RuntimeEvent, graph: DependencyGraph, now: string): OperationalStateRecord {
  const payload = (event.payload ?? {}) as Record<string, unknown>
  const entityId = String(payload.unresolvedId ?? payload.entityId ?? payload.threadId ?? `event:${event.id}`)
  const pressure = calculateDependencyPressure(graph, entityId)
  const inferred = inferHeuristicState({
    label: `${event.type} ${eventSummary(event)}`,
    directBlockers: pressure.directBlockers,
    chainDepth: pressure.chainDepth,
    pendingGovernance: pressure.pendingGovernance + (event.governanceState === 'pending' ? 1 : 0),
    escalations: pressure.escalations + (event.governanceState === 'escalated' ? 1 : 0),
  })
  const dependencyChain = findDependencyChains(graph, entityId)[0] ?? [entityId]

  const state: OperationalStateRecord = {
    stateId: `state:event:${event.id}`,
    entityId,
    entityType: event.payloadType ?? 'runtime-event',
    entityName: eventSummary(event),
    stateCode: event.governanceState === 'blocked' ? 'GOVERNANCE_BLOCKED' : inferred.code,
    stateLabel: `${event.governanceState === 'blocked' ? '🔴' : inferred.emoji} ${eventSummary(event)}`,
    stateEmoji: event.governanceState === 'blocked' ? '🔴' : inferred.emoji,
    severity: event.governanceState === 'blocked' ? 'high' : inferred.severity,
    lifecycle: event.governanceState === 'escalated' ? 'escalated' : initialLifecycleState(),
    triggerDetail: `${event.type} ${event.governanceState}/${event.executionState}`,
    resolutionAction: event.governanceState === 'blocked' ? 'Resolve governance blockage' : undefined,
    resolutionOwner: event.governanceState !== 'approved' ? 'Jon Hartman' : undefined,
    dependencyIds: dependencyChain.slice(1),
    dependencyChain,
    reasoningChain: [
      `event:${event.type}`,
      `governance:${event.governanceState}`,
      `execution:${event.executionState}`,
      `pressure:${pressure.score}`,
    ],
    derivationSource: event.governanceState !== 'approved' ? 'governance' : pressure.score > 0 ? 'dependency-graph' : 'runtime-events',
    sourceEventIds: [event.id],
    lineageIds: event.lineageId ? [event.lineageId] : [],
    traceId: event.traceId,
    derivedAt: now,
    derivationVersion: OPERATIONAL_STATE_DERIVATION_VERSION,
  }

  state.explanation = explainState(state).explanation
  return state
}

export function deriveOperationalState(input: {
  replayState: ReconstructedOperationalState
  operationalObjects: OperationalObject[]
  unresolvedDependencies: string[]
  governanceOutcomes: ReconstructedOperationalState['state']['governanceOutcomes']
  recentEvents: RuntimeEvent[]
}): {
  states: OperationalStateRecord[]
  dependencyGraph: DependencyGraph
  dependencyChains: string[][]
} {
  const now = new Date().toISOString()
  const dependencyGraph = buildDependencyGraph({
    recentEvents: input.recentEvents,
    operationalObjects: input.operationalObjects,
    unresolvedIds: [
      ...input.replayState.state.unresolvedContinuity,
      ...input.unresolvedDependencies,
    ],
  })

  const states = [
    ...input.operationalObjects.map((object) => recordFromObject(object, dependencyGraph, now)),
    ...input.recentEvents
      .filter((event) => !INFRASTRUCTURE_EVENT_TYPES.has(event.type) && (event.governanceState !== 'approved' || event.executionState === 'queued' || event.type.includes('continuity') || event.type.includes('unresolved')))
      .map((event) => recordFromEvent(event, dependencyGraph, now)),
  ]
    .filter((state, index, collection) =>
      collection.findIndex((item) => item.entityId === state.entityId && item.stateCode === state.stateCode) === index,
    )
    .sort((left, right) => severityRank(right.severity) - severityRank(left.severity))
    .slice(0, 24)

  return {
    states,
    dependencyGraph,
    dependencyChains: findDependencyChains(dependencyGraph).slice(0, 12),
  }
}

function severityRank(severity: OperationalStateRecord['severity']) {
  return { critical: 4, high: 3, medium: 2, low: 1 }[severity] ?? 0
}
