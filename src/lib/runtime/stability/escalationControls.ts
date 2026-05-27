import type { RuntimeEvent } from '../runtimeTypes'
import { createDeterministicTraceId } from '../trace/routingTrace'
import { buildCooldown, isCooldownActive } from './cooldowns'
import type { EscalationDelayState } from './cooldownState'

function payloadRecord(event: RuntimeEvent) {
  return event.payload && typeof event.payload === 'object' && !Array.isArray(event.payload)
    ? event.payload as Record<string, unknown>
    : {}
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

export function buildEscalationDelay(event: RuntimeEvent): EscalationDelayState | null {
  if (event.type !== 'operator.escalated' && event.type !== 'constitutional.escalated') return null

  const constitutionalExempt = event.type === 'constitutional.escalated'
  const cooldown = buildCooldown({
    kind: 'escalation',
    subjectId: event.lineageId ?? event.id,
    startedAt: event.createdAt,
    suppressionReason: constitutionalExempt
      ? 'Constitutional escalation remains exempt from pacing suppression.'
      : 'Operational escalation delayed to contain cascade.',
    constitutionalExempt,
  })

  return {
    escalationId: createDeterministicTraceId([event.workspaceId, event.lineageId, event.type, 'escalation-delay']),
    delayedUntil: cooldown.expiresAt,
    reason: cooldown.suppressionReason,
    constitutionalExempt,
  }
}

export function deriveEscalationControls(events: RuntimeEvent[], at?: string) {
  const delays = events
    .map(buildEscalationDelay)
    .filter((delay): delay is EscalationDelayState => Boolean(delay))

  return delays.map((delay) => ({
    ...delay,
    active: delay.constitutionalExempt ? false : isCooldownActive({
      cooldownId: delay.escalationId,
      kind: 'escalation',
      subjectId: delay.escalationId,
      startedAt: new Date(new Date(delay.delayedUntil).getTime() - 120_000).toISOString(),
      expiresAt: delay.delayedUntil,
      suppressionReason: delay.reason,
      constitutionalExempt: delay.constitutionalExempt,
    }, at ?? delay.delayedUntil),
  }))
}

export function escalationCeiling(event: RuntimeEvent) {
  const payload = payloadRecord(event)
  const path = stringList(payload.escalationPath)
  return path.length
}
