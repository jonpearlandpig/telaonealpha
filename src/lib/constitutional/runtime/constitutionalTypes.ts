import type { RightsValidation } from '@/lib/showtela/penAndSword'
import type { AuthorshipSurface, AuthorshipTrace, LineageRef } from '@/lib/showtela/types'
import type { AuthorityLevel } from '@/lib/runtime/actions'
import type { ExecutionState, GovernanceState, RuntimeEventSource } from '@/lib/runtime/runtimeTypes'

export const CONSTITUTIONAL_SYSTEM_IDS = ['telauthorium', 'pen-and-sword', 'the-ledger'] as const
export const CONSTITUTIONAL_LIFECYCLE_EVENT_TYPES = [
  'constitutional.invoked',
  'constitutional.validated',
  'constitutional.blocked',
  'constitutional.audit.logged',
  'constitutional.legitimacy.confirmed',
  'constitutional.escalated',
] as const
export const CONSTITUTIONAL_LEGITIMACY_STATES = ['confirmed', 'blocked'] as const
export const CONSTITUTIONAL_LEGALITY_STATES = ['confirmed', 'failed'] as const
export const CONSTITUTIONAL_ESCALATION_STATES = ['none', 'required', 'triggered'] as const

export type ConstitutionalSystemId = (typeof CONSTITUTIONAL_SYSTEM_IDS)[number]
export type ConstitutionalLifecycleEventType = (typeof CONSTITUTIONAL_LIFECYCLE_EVENT_TYPES)[number]
export type ConstitutionalLegitimacyState = (typeof CONSTITUTIONAL_LEGITIMACY_STATES)[number]
export type ConstitutionalLegalityState = (typeof CONSTITUTIONAL_LEGALITY_STATES)[number]
export type ConstitutionalEscalationState = (typeof CONSTITUTIONAL_ESCALATION_STATES)[number]

export type ConstitutionalAuditTrace = {
  auditId: string
  workspaceId: string
  loggedAt: string
  constitutionalPath: readonly ConstitutionalSystemId[]
  trigger: string
  traceId?: string
  correlationId?: string
}

export type ConstitutionalMiddlewareExecution = {
  id: ConstitutionalSystemId
  executed: true
  reason: string
}

export type ConstitutionalInput = {
  workspaceId: string
  action: string
  authority: AuthorityLevel
  governanceState: GovernanceState
  executionState: ExecutionState
  source?: RuntimeEventSource
  traceId?: string
  correlationId?: string
  payload?: Record<string, unknown>
  authorship?: {
    required?: boolean
    author?: string
    surface?: AuthorshipSurface
    parentLineageId?: string
    existingLineageChain?: readonly string[]
    rightsInheritance?: readonly string[]
    nilRestricted?: boolean
    nilReason?: string
  }
  classification?: {
    creativeOutput?: boolean
    sacredIp?: boolean
    authorshipSensitive?: boolean
  }
  triggerReason?: string
  timestamp?: string
}

export type ConstitutionalMiddlewareResult = {
  legitimacy: ConstitutionalLegitimacyState
  rightsValidation?: RightsValidation
  governanceState: GovernanceState
  constitutionalPath: readonly ConstitutionalSystemId[]
  auditTrace: ConstitutionalAuditTrace
  escalationRequired: boolean
  blockingReason?: string
  legalityConfirmed: boolean
  legalityState: ConstitutionalLegalityState
  escalationState: ConstitutionalEscalationState
  authorshipTrace: AuthorshipTrace
  lineageRef: LineageRef
  constitutionalSystems: readonly ConstitutionalMiddlewareExecution[]
}

export type ConstitutionalLifecycleEventDescriptor = {
  type: ConstitutionalLifecycleEventType
  payloadType: string
  governanceState: GovernanceState
  executionState: ExecutionState
}

export type ConstitutionalInvocationResult = ConstitutionalMiddlewareResult & {
  emittedEventIds: string[]
}
