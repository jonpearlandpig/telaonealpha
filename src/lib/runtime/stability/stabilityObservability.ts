import type { RuntimeEvent } from '../runtimeTypes'
import { deriveCooldownsFromEvents, isCooldownActive } from './cooldowns'
import { suppressDuplicateInvocations, buildInvocationSpacing } from './invocationWindow'
import { deriveEscalationControls } from './escalationControls'
import { derivePriorityTier } from './priorityTiers'

export function buildStabilityObservability(input: {
  events: RuntimeEvent[]
  at?: string
}) {
  const referenceTime = input.at ?? input.events.at(-1)?.createdAt ?? new Date(0).toISOString()
  const cooldowns = deriveCooldownsFromEvents(input.events)
  const activeCooldowns = cooldowns.filter((cooldown) => !cooldown.constitutionalExempt && isCooldownActive(cooldown, referenceTime))
  const suppression = suppressDuplicateInvocations(input.events, referenceTime)
  const escalationControls = deriveEscalationControls(input.events, referenceTime)
  const invocationSpacing = buildInvocationSpacing(input.events)

  return {
    activeCooldowns,
    suppressedInvocations: suppression,
    escalationSuppression: escalationControls.filter((control) => control.active),
    invocationPacing: invocationSpacing,
    cooldownExpiries: cooldowns.map((cooldown) => ({ cooldownId: cooldown.cooldownId, expiresAt: cooldown.expiresAt })),
    governanceStabilityMetrics: {
      constitutionalEvents: input.events.filter((event) => derivePriorityTier(event) === 'constitutional').length,
      governanceCriticalEvents: input.events.filter((event) => derivePriorityTier(event) === 'governance-critical').length,
      suppressedInvocationCount: suppression.length,
      escalationDelayCount: escalationControls.filter((control) => control.active).length,
    },
  }
}
