import type { RuntimeEvent } from '../runtimeTypes'
import { reconstructActiveEscalations, type EscalationEvent } from '../garvis/enforcement'

export type ReplayFrame = {
  id: string
  timestamp: string
  sequence?: number
  action: string
  eventType: string
  governanceState: string
  executionState: string
  blockers: string[]
  escalation?: {
    id?: string
    escalateTo?: string
    resolved?: boolean
  }
  lineageId?: string
  structuralSummary: string
}

export type ContinuityReplay = {
  workspaceId: string
  query?: string
  replayAuthority: 'runtime-events'
  window: {
    from?: string
    to?: string
  }
  totals: {
    events: number
    frames: number
    unresolvedEscalations: number
  }
  unresolvedEscalations: EscalationEvent[]
  frames: ReplayFrame[]
  summaryLines: string[]
}

type ReplayWindow = {
  from?: string
  to?: string
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function stringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function normalizeQuery(query?: string) {
  return query?.trim().toLowerCase() ?? ''
}

export function detectReplayWindow(query?: string, now = new Date()): ReplayWindow {
  const normalized = normalizeQuery(query)
  if (!normalized) return {}

  const end = now.toISOString()
  if (normalized.includes('since yesterday')) {
    return { from: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(), to: end }
  }
  if (normalized.includes('last week')) {
    return { from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(), to: end }
  }
  if (normalized.includes('today')) {
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    return { from: start.toISOString(), to: end }
  }

  return {}
}

function inWindow(event: RuntimeEvent, window: ReplayWindow) {
  if (window.from && event.createdAt < window.from) return false
  if (window.to && event.createdAt > window.to) return false
  return true
}

function includeEvent(event: RuntimeEvent) {
  return (
    event.type.includes('continuity') ||
    event.type.includes('unresolved') ||
    event.type.includes('rollback') ||
    event.type.includes('escalation') ||
    event.type.startsWith('operator.') ||
    event.type.startsWith('governance.')
  )
}

function frameSummary(event: RuntimeEvent) {
  const payload = (event.payload ?? {}) as Record<string, unknown>
  const action = stringValue(payload.action) ?? event.type
  const blockers = stringList(payload.blockers)
  const escalateTo = stringValue(payload.escalateTo)
  const unresolvedId = stringValue(payload.unresolvedId)
  const rollbackClass = stringValue(payload.classification)

  if (event.type === 'governance.escalation.propagated') {
    return `${action} escalated to ${escalateTo ?? 'authority'} with ${blockers.length} blocker${blockers.length === 1 ? '' : 's'}`
  }
  if (event.type === 'governance.escalation.resolved') {
    return `${action} escalation resolved`
  }
  if (event.type === 'governance.nil.blocked') {
    return `${action} blocked by NIL protection`
  }
  if (event.type === 'governance.two-key.blocked') {
    return `${action} blocked by Two-Key enforcement`
  }
  if (event.type === 'runtime.rollback.signaled') {
    return `${action} rollback signaled as ${rollbackClass ?? 'SAFE'}`
  }
  if (event.type === 'operator.analysis.completed') {
    return `${action} analysis completed in ${event.governanceState}/${event.executionState}`
  }
  if (event.type === 'operator.execution.completed') {
    return `${action} execution completed`
  }
  if (event.type === 'continuity.ingested') {
    return `continuity ingested${unresolvedId ? ` for ${unresolvedId}` : ''}`
  }
  return `${action} moved through ${event.governanceState}/${event.executionState}`
}

function toFrame(event: RuntimeEvent): ReplayFrame {
  const payload = (event.payload ?? {}) as Record<string, unknown>
  return {
    id: event.id,
    timestamp: event.createdAt,
    sequence: event.replaySequence,
    action: stringValue(payload.action) ?? event.type,
    eventType: event.type,
    governanceState: event.governanceState,
    executionState: event.executionState,
    blockers: stringList(payload.blockers),
    escalation: event.type.includes('escalation')
      ? {
          id: stringValue(payload.escalationId),
          escalateTo: stringValue(payload.escalateTo),
          resolved: payload.resolved === true,
        }
      : undefined,
    lineageId: event.lineageId,
    structuralSummary: frameSummary(event),
  }
}

export function buildContinuityReplay(input: {
  workspaceId: string
  events: RuntimeEvent[]
  query?: string
  now?: Date
}): ContinuityReplay {
  const window = detectReplayWindow(input.query, input.now)
  const ordered = [...input.events]
    .sort((left, right) => (left.replaySequence ?? 0) - (right.replaySequence ?? 0))
    .filter((event) => inWindow(event, window))

  const frames = ordered.filter(includeEvent).map(toFrame)
  const unresolvedEscalations = reconstructActiveEscalations(ordered)
  const summaryLines = [
    frames[0] ? `Replay window begins ${frames[0].timestamp}.` : 'No replay activity found in the requested window.',
    frames.at(-1) ? `Latest structural event: ${frames.at(-1)?.structuralSummary}.` : 'No structural event available.',
    unresolvedEscalations.length > 0
      ? `${unresolvedEscalations.length} unresolved escalation${unresolvedEscalations.length === 1 ? '' : 's'} remain active.`
      : 'No unresolved escalation remains active in the replay window.',
  ]

  return {
    workspaceId: input.workspaceId,
    query: input.query,
    replayAuthority: 'runtime-events',
    window,
    totals: {
      events: ordered.length,
      frames: frames.length,
      unresolvedEscalations: unresolvedEscalations.length,
    },
    unresolvedEscalations,
    frames,
    summaryLines,
  }
}

export function renderContinuityReplayAnswer(replay: ContinuityReplay) {
  if (replay.frames.length === 0) {
    return replay.summaryLines.join(' ')
  }

  const frameLines = replay.frames
    .slice(-6)
    .map((frame) => `${frame.timestamp} ${frame.structuralSummary}.`)

  return [...replay.summaryLines, ...frameLines].join(' ')
}
