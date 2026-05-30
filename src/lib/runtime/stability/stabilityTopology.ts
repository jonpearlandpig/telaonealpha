import type { RuntimeEvent } from '../runtimeTypes'
import { deriveCooldownsFromEvents, isCooldownActive } from './cooldowns'
import { deriveEscalationControls } from './escalationControls'
import { derivePriorityReason, derivePriorityTier } from './priorityTiers'
import { suppressDuplicateInvocations } from './invocationWindow'

export function inspectStabilityTopology(input: {
  events: RuntimeEvent[]
  at?: string
}) {
  const referenceTime = input.at ?? input.events.at(-1)?.createdAt ?? new Date(0).toISOString()
  const cooldowns = deriveCooldownsFromEvents(input.events)
  const activeCooldowns = cooldowns.filter((cooldown) => isCooldownActive(cooldown, referenceTime))
  const escalationControls = deriveEscalationControls(input.events, referenceTime)
  const suppressed = suppressDuplicateInvocations(input.events, referenceTime)

  return {
    whatIsSuppressed: suppressed.map((item) => item.invocationId),
    whyItIsSuppressed: suppressed.map((item) => item.reason),
    priorityTiers: input.events.map((event) => ({
      eventId: event.id,
      tier: derivePriorityTier(event),
      reason: derivePriorityReason(event),
    })),
    activeCooldowns,
    delayedEscalations: escalationControls.filter((control) => control.active),
    constitutionalExempt: cooldowns.filter((cooldown) => cooldown.constitutionalExempt).map((cooldown) => cooldown.subjectId),
  }
}
