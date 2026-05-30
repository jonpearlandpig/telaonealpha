import type { RuntimeEvent } from '../runtimeTypes'
import { createDeterministicTraceId } from '../trace/routingTrace'
import { buildCooldown, isCooldownActive } from './cooldowns'

function payloadRecord(event: RuntimeEvent) {
  return event.payload && typeof event.payload === 'object' && !Array.isArray(event.payload)
    ? event.payload as Record<string, unknown>
    : {}
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

export function createInvocationSpacingId(event: RuntimeEvent) {
  const payload = payloadRecord(event)
  return createDeterministicTraceId([
    event.workspaceId,
    stringValue(payload.action),
    stringValue(payload.operatorId),
    event.lineageId,
    'invocation-window',
  ])
}

export function suppressDuplicateInvocations(events: RuntimeEvent[], at?: string) {
  const ordered = [...events].sort((left, right) => left.createdAt.localeCompare(right.createdAt))
  const seen = new Map<string, RuntimeEvent>()
  const suppressed: Array<{ invocationId: string; reason: string; sourceEventId: string }> = []

  for (const event of ordered) {
    if (event.type !== 'operator.invoked' && event.type !== 'operator.execution.approved') continue
    const invocationId = createInvocationSpacingId(event)
    const prior = seen.get(invocationId)
    if (!prior) {
      seen.set(invocationId, event)
      continue
    }

    const cooldown = buildCooldown({
      kind: 'duplicate-suppression',
      subjectId: invocationId,
      startedAt: prior.createdAt,
      suppressionReason: 'Duplicate invocation suppressed inside deterministic window.',
    })

    if (isCooldownActive(cooldown, at ?? event.createdAt)) {
      suppressed.push({
        invocationId,
        reason: cooldown.suppressionReason,
        sourceEventId: event.id,
      })
    } else {
      seen.set(invocationId, event)
    }
  }

  return suppressed
}

export function buildInvocationSpacing(events: RuntimeEvent[]) {
  const ordered = [...events]
    .filter((event) => event.type === 'operator.invoked')
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))

  return ordered.map((event, index) => ({
    invocationId: createInvocationSpacingId(event),
    sourceEventId: event.id,
    previousInvocationId: index > 0 ? createInvocationSpacingId(ordered[index - 1]!) : undefined,
    invokedAt: event.createdAt,
  }))
}
