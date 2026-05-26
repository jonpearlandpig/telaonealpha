import crypto from 'crypto'

import type { OperationalState } from './operationalState'
import type { AuthorityLevel, RuntimeAction } from './actions'

export const RUNTIME_EVENT_SCHEMA_VERSION = 'runtime.v1'
export const RUNTIME_EVENT_VERSION = 1
export const GOVERNANCE_STATES = ['approved', 'blocked', 'escalated', 'pending'] as const
export const EXECUTION_STATES = ['queued', 'completed', 'failed', 'rolled-back'] as const

export type RuntimeEventSource = 'user' | 'system' | 'operator' | 'automation'
export type GovernanceState = (typeof GOVERNANCE_STATES)[number]
export type ExecutionState = (typeof EXECUTION_STATES)[number]

export type RuntimeEventPayload = Record<string, unknown>

export type RuntimeEvent<TPayload extends RuntimeEventPayload = RuntimeEventPayload> = {
  id: string
  workspaceId?: string
  replaySequence?: number
  type: string
  eventVersion: number
  schemaVersion: string
  source: RuntimeEventSource
  governanceState: GovernanceState
  executionState: ExecutionState
  traceId?: string
  correlationId?: string
  lineageId?: string
  payloadType?: string
  createdAt: string
  payload?: TPayload
}

export type RuntimeEventInput<TPayload extends RuntimeEventPayload = RuntimeEventPayload> = {
  id?: string
  workspaceId?: string
  replaySequence?: number
  type: string
  eventVersion?: number
  schemaVersion?: string
  source: RuntimeEventSource
  governanceState: GovernanceState
  executionState: ExecutionState
  traceId?: string
  correlationId?: string
  lineageId?: string
  payloadType?: string
  createdAt?: string
  payload?: TPayload
}

export type RuntimeEventHandler = (event: RuntimeEvent) => void | Promise<void>

export type RuntimeEventStoreResult = {
  persisted: boolean
  eventId: string
  error?: string
}

export type ReconstructedOperationalState = {
  state: OperationalState
  replayedEventCount: number
  lastEventAt?: string
  lastReplaySequence?: number
  checkpointSnapshotId?: string
  replaySource: 'events'
}

export type LegalityCheckInput = {
  action: RuntimeAction
  governanceState: GovernanceState
  executionState: ExecutionState
  authority: AuthorityLevel
  previousAction?: RuntimeAction
}

export type LegalityCheckResult = {
  allowed: boolean
  governanceState: GovernanceState
  executionState: ExecutionState
  action: RuntimeAction
  requiredAuthority: AuthorityLevel
  allowedNextActions: RuntimeAction[]
  escalationRequired: boolean
  denialReason?: string
}

export type OperatorDefinition = {
  id: string
  label: string
  domain: 'continuity' | 'flightpath' | 'mose' | 'garvis'
  authorityFloor: AuthorityLevel
  capabilities: RuntimeAction[]
  governanceStates: GovernanceState[]
  rollbackCeiling: RollbackClass
}

export type RoutingPlanStep = {
  order: number
  operatorId: string
  action: RuntimeAction
}

export type RollbackClass = 'none' | 'soft' | 'hard'

export type RoutingPlan = {
  id: string
  selectedOperators: string[]
  sequence: RoutingPlanStep[]
  rollbackClass: RollbackClass
  escalationPath: string[]
  governanceState: GovernanceState
}

export type EnforcementResult = {
  allowed: boolean
  reason?: string
  emittedEventIds: string[]
}

export function isGovernanceState(value: string): value is GovernanceState {
  return GOVERNANCE_STATES.includes(value as GovernanceState)
}

export function isExecutionState(value: string): value is ExecutionState {
  return EXECUTION_STATES.includes(value as ExecutionState)
}

export function createRuntimeEvent<TPayload extends RuntimeEventPayload>(
  input: RuntimeEventInput<TPayload>,
): RuntimeEvent<TPayload> {
  return {
    id: input.id ?? crypto.randomUUID(),
    workspaceId: input.workspaceId,
    replaySequence: input.replaySequence,
    type: input.type,
    eventVersion: input.eventVersion ?? RUNTIME_EVENT_VERSION,
    schemaVersion: input.schemaVersion ?? RUNTIME_EVENT_SCHEMA_VERSION,
    source: input.source,
    governanceState: input.governanceState,
    executionState: input.executionState,
    traceId: input.traceId,
    correlationId: input.correlationId,
    lineageId: input.lineageId,
    payloadType: input.payloadType,
    createdAt: input.createdAt ?? new Date().toISOString(),
    payload: input.payload,
  }
}
