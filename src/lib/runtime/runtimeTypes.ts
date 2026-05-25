import crypto from 'crypto'

import type { OperationalState } from './operationalState'
import type { AuthorityLevel, RuntimeAction } from './actions'

export const RUNTIME_EVENT_SCHEMA_VERSION = 'runtime.v1'
export const RUNTIME_EVENT_VERSION = 1

export type RuntimeEventSource = 'user' | 'system' | 'operator' | 'automation'

export type RuntimeEventPayload = Record<string, unknown>

export type RuntimeEvent<TPayload extends RuntimeEventPayload = RuntimeEventPayload> = {
  id: string
  type: string
  eventVersion: number
  schemaVersion: string
  source: RuntimeEventSource
  governanceState: string
  executionState: string
  traceId?: string
  correlationId?: string
  lineageId?: string
  payloadType?: string
  createdAt: string
  payload?: TPayload
}

export type RuntimeEventInput<TPayload extends RuntimeEventPayload = RuntimeEventPayload> = {
  id?: string
  type: string
  eventVersion?: number
  schemaVersion?: string
  source: RuntimeEventSource
  governanceState: string
  executionState: string
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
}

export type LegalityCheckInput = {
  action: RuntimeAction
  governanceState: string
  executionState: string
  authority: AuthorityLevel
}

export type LegalityCheckResult = {
  allowed: boolean
  governanceState: string
  executionState: string
  action: RuntimeAction
  requiredAuthority: AuthorityLevel
  allowedNextActions: RuntimeAction[]
  escalationRequired: boolean
  denialReason?: string
}

export type OperatorDefinition = {
  id: string
  label: string
  authorityFloor: AuthorityLevel
  capabilities: RuntimeAction[]
  governanceStates: string[]
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
  governanceState: string
}

export type EnforcementResult = {
  allowed: boolean
  reason?: string
  emittedEventIds: string[]
}

export function createRuntimeEvent<TPayload extends RuntimeEventPayload>(
  input: RuntimeEventInput<TPayload>,
): RuntimeEvent<TPayload> {
  return {
    id: input.id ?? crypto.randomUUID(),
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
