import type { ContinuityEvent } from '@/lib/showtela/types'
import type { OperationalProjection, OperationalStateRecord } from '@/lib/runtime/state/model'
import type { FocusEngineResult } from '@/lib/focus/types'
import type { BriefingChange, OperationalBrief } from './types'

const BRIEF_HEADLINE = 'Operational Brief'
const MAX_CHANGES = 10

export function computeCurrentReadiness(projection: OperationalProjection): number {
  const { critical, high, medium, low, readiness: ready, movement, escalations } = projection.groupedTopology
  const deduction = critical * 15 + high * 8 + medium * 4 + low * 2 + escalations * 5
  const bonus = ready * 5 + movement * 3
  return Math.max(0, Math.min(100, 100 - deduction + bonus))
}

function resolveEventOwner(event: ContinuityEvent): string {
  return event.owner?.name?.trim() || 'Unassigned'
}

function resolveStateOwner(state: OperationalStateRecord): string {
  return state.resolutionOwner?.trim() || state.entityName?.trim() || 'Unassigned'
}

function stripLeadingEmoji(label: string): string {
  return label.replace(/^\S+\s/, '').trim()
}

function changesFromFeed(feed: ContinuityEvent[]): BriefingChange[] {
  return feed.slice(0, MAX_CHANGES).map((event) => ({
    id: event.id,
    headline: event.headline,
    timestamp: event.timestamp ?? new Date().toISOString(),
    owner: resolveEventOwner(event),
    type: 'new-event' as const,
  }))
}

function improvementsFromProjection(projection: OperationalProjection): BriefingChange[] {
  return projection.states
    .filter((s) => s.lifecycle === 'resolved' || s.lifecycle === 'superseded')
    .map((state) => ({
      id: state.stateId,
      headline: `${state.entityName} — resolved`,
      timestamp: state.derivedAt,
      owner: resolveStateOwner(state),
      type: 'resolved' as const,
    }))
}

function concernsFromProjection(projection: OperationalProjection): BriefingChange[] {
  const seen = new Set<string>()
  const concerns: BriefingChange[] = []

  for (const state of projection.blockers) {
    if (seen.has(state.stateId)) continue
    seen.add(state.stateId)
    concerns.push({
      id: state.stateId,
      headline: stripLeadingEmoji(state.stateLabel) || state.entityName,
      timestamp: state.derivedAt,
      owner: resolveStateOwner(state),
      type: 'new-blocker',
    })
  }

  for (const state of projection.escalations) {
    if (seen.has(state.stateId)) continue
    seen.add(state.stateId)
    concerns.push({
      id: state.stateId,
      headline: stripLeadingEmoji(state.stateLabel) || state.entityName,
      timestamp: state.derivedAt,
      owner: resolveStateOwner(state),
      type: 'escalation',
    })
  }

  return concerns
}

export function buildBriefingEngine(input: {
  continuityFeed: ContinuityEvent[]
  projection: OperationalProjection
  focusResult: FocusEngineResult
  unresolvedIds?: string[]
  previousReadiness?: number
}): OperationalBrief {
  const { continuityFeed, projection, focusResult } = input
  const previousReadiness = input.previousReadiness ?? 0

  const changes = changesFromFeed(continuityFeed)
  const improvements = improvementsFromProjection(projection)
  const concerns = concernsFromProjection(projection)

  const currentReadiness = computeCurrentReadiness(projection)
  const readinessDelta = currentReadiness - previousReadiness

  const topFocus = focusResult.topFocus
    ? { title: focusResult.topFocus.title, priority: focusResult.topFocus.priorityScore }
    : null

  return {
    headline: BRIEF_HEADLINE,
    generatedAt: new Date().toISOString(),
    newEvents: changes.length,
    resolvedItems: improvements.length,
    newBlockers: projection.blockers.length,
    currentReadiness,
    previousReadiness,
    readinessDelta,
    topFocus,
    recommendedAction: focusResult.topFocus?.recommendedAction ?? '',
    changes,
    improvements,
    concerns,
  }
}
