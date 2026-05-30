import { propagateEscalation } from '@/lib/runtime/garvis/enforcement'
import { reconstructOperationalStateFromReplay } from '@/lib/runtime/replay/reconstructOperationalState'
import { deriveOperationalState } from '@/lib/runtime/state/deriveOperationalState'
import type { RuntimeEvent } from '@/lib/runtime/runtimeTypes'
import { SHOWTELA_WORKSPACE_ID } from './runtimeIds'

const STALE_UNRESOLVED_THRESHOLD_MS = 72 * 60 * 60 * 1000

export type StaleUnresolvedState = {
  stateId: string
  entityId: string
  stateCode: string
  stateLabel: string
  firstObservedAt: string
  ageHours: number
  sourceEventIds: string[]
}

function ageHours(observedAt: string, now: Date) {
  return Math.floor((now.getTime() - new Date(observedAt).getTime()) / (60 * 60 * 1000))
}

function isReviewPressure(state: {
  stateCode: string
  stateLabel: string
  triggerDetail: string
  reasoningChain: string[]
  sourceEventIds?: string[]
}, eventsById: Map<string, RuntimeEvent>) {
  if (state.stateCode === 'AWAITING_COMMITMENT' || state.stateCode === 'NEEDS_REVIEW') return true
  const sourceText = (state.sourceEventIds ?? [])
    .map((id) => {
      const event = eventsById.get(id)
      const payload = (event?.payload ?? {}) as Record<string, unknown>
      return [
        payload.headline,
        payload.title,
        payload.summary,
        payload.reason,
        payload.denialReason,
      ].filter((value): value is string => typeof value === 'string').join(' ')
    })
    .join(' ')

  const composite = [state.stateLabel, state.triggerDetail, ...state.reasoningChain, sourceText].join(' ').toLowerCase()
  return composite.includes('awaiting') || composite.includes('review') || composite.includes('commitment')
}

export function findStaleUnresolvedStates(input: {
  workspaceId: string
  now?: Date
  replayEvents: RuntimeEvent[]
}) {
  const now = input.now ?? new Date()
  const replay = reconstructOperationalStateFromReplay(input.replayEvents)
  const derived = deriveOperationalState({
    replayState: replay,
    operationalObjects: replay.state.operationalObjects,
    unresolvedDependencies: replay.state.unresolvedContinuity,
    governanceOutcomes: replay.state.governanceOutcomes,
    recentEvents: input.replayEvents.slice(-20),
  })
  const createdAtById = new Map(input.replayEvents.map((event) => [event.id, event.createdAt]))
  const eventsById = new Map(input.replayEvents.map((event) => [event.id, event]))

  return derived.states
    .filter((state) => isReviewPressure(state, eventsById))
    .map((state) => {
      const sourceEventIds = state.sourceEventIds ?? []
      const firstObservedAt = sourceEventIds
        .map((id) => createdAtById.get(id))
        .filter((value): value is string => Boolean(value))
        .sort()[0] ?? state.derivedAt

      return {
        stateId: state.stateId,
        entityId: state.entityId,
        stateCode: state.stateCode,
        stateLabel: state.stateLabel,
        firstObservedAt,
        ageHours: ageHours(firstObservedAt, now),
        sourceEventIds,
      }
    })
    .filter((state) => now.getTime() - new Date(state.firstObservedAt).getTime() >= STALE_UNRESOLVED_THRESHOLD_MS)
}

export async function ensureUnresolvedPersistence(input?: {
  workspaceId?: string
  now?: Date
}) {
  const workspaceId = input?.workspaceId ?? SHOWTELA_WORKSPACE_ID
  const { getAllReplayEventsForWorkspace } = await import('@/lib/runtime/eventStore')
  const replayEvents = await getAllReplayEventsForWorkspace(workspaceId)
  const staleStates = findStaleUnresolvedStates({
    workspaceId,
    replayEvents,
    now: input?.now,
  })
  const emittedEventIds: string[] = []

  for (const state of staleStates) {
    const duplicate = replayEvents.some((event) => {
      if (event.type !== 'governance.escalation.propagated') return false
      const payload = (event.payload ?? {}) as Record<string, unknown>
      return payload.stateId === state.stateId && payload.escalationCategory === 'STALE_72_HOURS'
    })
    if (duplicate) continue

    const event = await propagateEscalation({
      workspaceId,
      action: 'stale.unresolved',
      blockers: [
        `${state.stateCode} persisted beyond 72 hours.`,
        `Entity ${state.entityId} remains unresolved after ${state.ageHours} hours.`,
      ],
      escalateTo: 'S1',
      payloadType: 'showtela.unresolved.persistence',
      extraPayload: {
        stateId: state.stateId,
        stateCode: state.stateCode,
        stateLabel: state.stateLabel,
        escalationCategory: 'STALE_72_HOURS',
        firstObservedAt: state.firstObservedAt,
        sourceEventIds: state.sourceEventIds,
      },
    })
    emittedEventIds.push(event.id)
  }

  return {
    workspaceId,
    staleStates,
    emittedEventIds,
  }
}
