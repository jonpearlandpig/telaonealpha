export type CooldownKind = 'invocation' | 'routing' | 'escalation' | 'duplicate-suppression'

export type CooldownState = {
  cooldownId: string
  kind: CooldownKind
  subjectId: string
  startedAt: string
  expiresAt: string
  suppressionReason: string
  constitutionalExempt: boolean
}

export type EscalationDelayState = {
  escalationId: string
  delayedUntil: string
  reason: string
  constitutionalExempt: boolean
}

export type ActiveCooldownInspection = {
  activeCooldowns: readonly CooldownState[]
  escalationDelays: readonly EscalationDelayState[]
  suppressedInvocationIds: readonly string[]
}
