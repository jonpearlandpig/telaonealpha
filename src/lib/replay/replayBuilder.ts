import type { ContinuityEvent } from '@/lib/showtela/types'
import type { OperationalProjection } from '@/lib/runtime/state/model'
import type { FocusEngineResult } from '@/lib/focus/types'
import type { ReplayOutput, ReplayStep, ReplayStepState } from './types'

const RESOLUTION_KEYWORDS = ['resolved', 'approved', 'cleared', 'completed', 'confirmed', 'signed', 'accepted']
const FOCUS_KEYWORDS = ['\\brf\\b', 'rider', 'roster', 'advance', 'contract', 'deposit', 'load-in', 'staffing', 'production approval']

const READINESS_DELTAS: Record<ReplayStepState, number> = {
  BLOCKER_CREATED: -5,
  BLOCKER_RESOLVED: 5,
  PRESSURE_INCREASED: -3,
  PRESSURE_DECREASED: 3,
  DEPENDENCY_ADDED: -2,
  DEPENDENCY_CLEARED: 3,
  FOCUS_EVENT: -3,
  CONTINUITY_RECORDED: 0,
}

function lc(event: ContinuityEvent): string {
  return `${event.headline} ${event.body ?? ''} ${event.summary ?? ''}`.toLowerCase()
}

function isFocusRelated(event: ContinuityEvent): boolean {
  const text = lc(event)
  return FOCUS_KEYWORDS.some((kw) => new RegExp(kw).test(text))
}

function hasResolutionSignal(event: ContinuityEvent): boolean {
  const text = lc(event)
  return RESOLUTION_KEYWORDS.some((kw) => text.includes(kw))
}

function hasBlockerSignal(event: ContinuityEvent): boolean {
  return (
    Boolean(event.blockedBy) ||
    (event.unresolvedDependencies?.length ?? 0) > 0 ||
    (event.unresolvedMarkers?.length ?? 0) > 0
  )
}

export function deriveResultingState(event: ContinuityEvent): ReplayStepState {
  if (hasBlockerSignal(event) && !hasResolutionSignal(event)) {
    return 'BLOCKER_CREATED'
  }

  if (hasResolutionSignal(event) && !hasBlockerSignal(event)) {
    return event.waitingOn ? 'DEPENDENCY_CLEARED' : 'BLOCKER_RESOLVED'
  }

  if (
    event.pressure === 'high' ||
    event.pressure === 'critical' ||
    event.operationalRisk === 'high' ||
    event.operationalRisk === 'critical'
  ) {
    return 'PRESSURE_INCREASED'
  }

  if (event.pressure === 'low' && !hasBlockerSignal(event)) {
    return 'PRESSURE_DECREASED'
  }

  if (isFocusRelated(event)) {
    return 'FOCUS_EVENT'
  }

  if (event.waitingOn) {
    return 'DEPENDENCY_ADDED'
  }

  return 'CONTINUITY_RECORDED'
}

export function deriveExplanation(event: ContinuityEvent, state: ReplayStepState): string {
  const parts: string[] = []

  if (event.blockedBy) {
    parts.push(`Blocked by: ${event.blockedBy}`)
  }
  if (event.waitingOn) {
    parts.push(`Waiting on: ${event.waitingOn}`)
  }
  if ((event.unresolvedDependencies?.length ?? 0) > 0) {
    parts.push(`${event.unresolvedDependencies!.length} unresolved dependenc${event.unresolvedDependencies!.length === 1 ? 'y' : 'ies'} present`)
  }
  if (event.pressure === 'high' || event.pressure === 'critical') {
    parts.push(`Pressure level: ${event.pressure}`)
  }
  if (event.operationalRisk === 'high' || event.operationalRisk === 'critical') {
    parts.push(`Operational risk: ${event.operationalRisk}`)
  }
  if ((event.unresolvedMarkers?.length ?? 0) > 0) {
    parts.push(`Unresolved markers: ${event.unresolvedMarkers!.join(', ')}`)
  }

  if (parts.length > 0) return parts.join('. ')

  switch (state) {
    case 'BLOCKER_RESOLVED': return 'Blocking dependency resolved — operational progress restored'
    case 'DEPENDENCY_CLEARED': return 'Dependency cleared — waiting condition satisfied'
    case 'PRESSURE_DECREASED': return 'Pressure level decreased — field conditions improved'
    case 'FOCUS_EVENT': return 'Focus-relevant operational event recorded'
    case 'CONTINUITY_RECORDED': return 'Operational continuity event recorded'
    case 'DEPENDENCY_ADDED': return 'New dependency added to operational field'
    case 'BLOCKER_CREATED': return 'Operational blocker created'
    case 'PRESSURE_INCREASED': return 'Operational pressure increased'
  }
}

function resolveEventOwner(event: ContinuityEvent): string {
  return event.owner?.name?.trim() || 'Unassigned'
}

function buildStep(event: ContinuityEvent): ReplayStep {
  const state = deriveResultingState(event)
  const focused = isFocusRelated(event)
  const resolution = state === 'BLOCKER_RESOLVED' || state === 'DEPENDENCY_CLEARED'
  const blocker = state === 'BLOCKER_CREATED'

  return {
    id: event.id,
    timestamp: event.timestamp ?? new Date(0).toISOString(),
    headline: event.headline,
    owner: resolveEventOwner(event),
    linkedEntities: event.linkedEntities ?? [],
    resultingState: state,
    explanation: deriveExplanation(event, state),
    readinessDelta: READINESS_DELTAS[state],
    isBlocker: blocker,
    isFocusRelated: focused,
    isResolution: resolution,
  }
}

export function buildReplayEngine(input: {
  continuityFeed: ContinuityEvent[]
  projection: OperationalProjection
  focusResult: FocusEngineResult
  currentReadiness: number
}): ReplayOutput {
  const { continuityFeed, focusResult, currentReadiness } = input

  const timeline = [...continuityFeed]
    .sort((a, b) => (a.timestamp ?? '').localeCompare(b.timestamp ?? ''))
    .map(buildStep)

  const topFocus = focusResult.topFocus
    ? { title: focusResult.topFocus.title, priority: focusResult.topFocus.priorityScore }
    : null

  return {
    generatedAt: new Date().toISOString(),
    stepCount: timeline.length,
    currentReadiness,
    topFocus,
    timeline,
  }
}
