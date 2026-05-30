import { getAllReplayEventsForWorkspace, getRecentEvents } from '../eventStore'
import type { RuntimeEvent } from '../runtimeTypes'
import { reconstructOperationalStateFromReplay } from '../replay/reconstructOperationalState'
import { deriveOperationalState } from './deriveOperationalState'
import {
  OPERATIONAL_PROJECTION_VERSION,
  OPERATIONAL_STATE_DERIVATION_VERSION,
  type OperationalProjection,
  type OperationalStateRecord,
} from './model'

function pickMovement(states: OperationalStateRecord[]) {
  return states.filter((state) => state.stateCode === 'ACTIVELY_MOVING' || state.stateCode === 'READY_TO_ADVANCE').slice(0, 3)
}

function pickReadiness(states: OperationalStateRecord[]) {
  return states.filter((state) => state.stateCode === 'READY_TO_ADVANCE').slice(0, 3)
}

function pickBlockers(states: OperationalStateRecord[]) {
  return states.filter((state) => state.severity === 'critical' || state.stateCode === 'UNRESOLVED_DEPENDENCY' || state.stateCode === 'GOVERNANCE_BLOCKED').slice(0, 4)
}

function pickEscalations(states: OperationalStateRecord[]) {
  return states.filter((state) => state.lifecycle === 'escalated' || state.stateCode === 'ESCALATION_RISK').slice(0, 4)
}

function summaryLine(label: string, fallback: string) {
  return label || fallback
}

export function buildOperationalProjectionFromEvents(input: {
  workspaceId: string
  showId?: string
  replayEvents: RuntimeEvent[]
  recentEvents?: RuntimeEvent[]
}): OperationalProjection {
  const replay = reconstructOperationalStateFromReplay(input.replayEvents)
  const recentEvents = input.recentEvents ?? input.replayEvents.slice(-20)
  const derived = deriveOperationalState({
    replayState: replay,
    operationalObjects: replay.state.operationalObjects,
    unresolvedDependencies: replay.state.unresolvedContinuity,
    governanceOutcomes: replay.state.governanceOutcomes,
    recentEvents,
  })

  const blockers = pickBlockers(derived.states)
  const movement = pickMovement(derived.states)
  const readiness = pickReadiness(derived.states)
  const escalations = pickEscalations(derived.states)
  const generatedAt = new Date().toISOString()

  return {
    workspaceId: input.workspaceId,
    showId: input.showId ?? 'crusade',
    projectionVersion: OPERATIONAL_PROJECTION_VERSION,
    generatedAt,
    derivedAt: generatedAt,
    derivationVersion: OPERATIONAL_STATE_DERIVATION_VERSION,
    derivedFromEventCount: replay.replayedEventCount,
    replayCursor: replay.lastReplaySequence,
    states: derived.states,
    blockers,
    movement,
    readiness,
    escalations,
    dependencyChains: derived.dependencyChains,
    groupedTopology: {
      critical: derived.states.filter((state) => state.severity === 'critical').length,
      high: derived.states.filter((state) => state.severity === 'high').length,
      medium: derived.states.filter((state) => state.severity === 'medium').length,
      low: derived.states.filter((state) => state.severity === 'low').length,
      blockers: blockers.length,
      movement: movement.length,
      readiness: readiness.length,
      escalations: escalations.length,
    },
    summary: {
      currentTruth: summaryLine(blockers[0]?.stateLabel ?? '', 'Operational field is currently calm.'),
      mattersNow: summaryLine(blockers[1]?.explanation ?? movement[0]?.explanation ?? '', 'No blocker chain is currently dominating the field.'),
      nextMovement: summaryLine(readiness[0]?.stateLabel ?? movement[0]?.stateLabel ?? '', 'Confirm the next operational move from runtime continuity.'),
      blockersLabel: blockers[0]?.stateLabel ?? 'No blocker currently dominates.',
      movementLabel: movement[0]?.stateLabel ?? 'No active movement is currently surfaced.',
      readinessLabel: readiness[0]?.stateLabel ?? 'No ready state has been elevated yet.',
    },
  }
}

export async function buildOperationalProjectionForWorkspace(workspaceId: string, showId = 'crusade') {
  const [replayEvents, recentEvents] = await Promise.all([
    getAllReplayEventsForWorkspace(workspaceId),
    getRecentEvents(20),
  ])

  return buildOperationalProjectionFromEvents({
    workspaceId,
    showId,
    replayEvents,
    recentEvents: recentEvents.filter((event) => event.workspaceId === workspaceId),
  })
}
