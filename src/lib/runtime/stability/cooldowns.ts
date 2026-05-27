import { createDeterministicTraceId } from '../trace/routingTrace'
import type { RuntimeEvent } from '../runtimeTypes'
import type { CooldownKind, CooldownState } from './cooldownState'

export const COOLDOWN_WINDOWS_MS = {
  invocation: 60_000,
  routing: 30_000,
  escalation: 120_000,
  'duplicate-suppression': 180_000,
} as const

function addMs(timestamp: string, durationMs: number) {
  return new Date(new Date(timestamp).getTime() + durationMs).toISOString()
}

export function buildCooldown(input: {
  kind: CooldownKind
  subjectId: string
  startedAt: string
  suppressionReason: string
  constitutionalExempt?: boolean
  durationMs?: number
}): CooldownState {
  const durationMs = input.durationMs ?? COOLDOWN_WINDOWS_MS[input.kind]
  return {
    cooldownId: createDeterministicTraceId([input.kind, input.subjectId, input.startedAt, 'cooldown']),
    kind: input.kind,
    subjectId: input.subjectId,
    startedAt: input.startedAt,
    expiresAt: addMs(input.startedAt, durationMs),
    suppressionReason: input.suppressionReason,
    constitutionalExempt: input.constitutionalExempt === true,
  }
}

export function isCooldownActive(cooldown: CooldownState, at: string) {
  return new Date(cooldown.expiresAt).getTime() > new Date(at).getTime()
}

export function deriveCooldownsFromEvents(events: RuntimeEvent[]) {
  return events.flatMap((event) => {
    if (event.type === 'operator.invoked') {
      return [
        buildCooldown({
          kind: 'invocation',
          subjectId: event.lineageId ?? event.id,
          startedAt: event.createdAt,
          suppressionReason: 'Invocation pacing active after operator invocation.',
        }),
      ]
    }

    if (event.type === 'operator.analysis.completed') {
      return [
        buildCooldown({
          kind: 'routing',
          subjectId: event.lineageId ?? event.id,
          startedAt: event.createdAt,
          suppressionReason: 'Routing pacing active after governed analysis.',
        }),
      ]
    }

    if (event.type === 'operator.escalated') {
      return [
        buildCooldown({
          kind: 'escalation',
          subjectId: event.lineageId ?? event.id,
          startedAt: event.createdAt,
          suppressionReason: 'Escalation pacing active to contain cascade.',
        }),
      ]
    }

    if (event.type === 'constitutional.invoked') {
      return [
        buildCooldown({
          kind: 'duplicate-suppression',
          subjectId: event.lineageId ?? event.id,
          startedAt: event.createdAt,
          suppressionReason: 'Duplicate suppression window open after constitutional invocation.',
          constitutionalExempt: true,
        }),
      ]
    }

    return []
  })
}
