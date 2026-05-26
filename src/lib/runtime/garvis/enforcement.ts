import { emitRuntimeEvent } from '../eventBus'
import { evaluateActionLegality } from '../flightpath/legalityEngine'
import type { AuthorityLevel, RuntimeAction } from '../actions'
import type { EnforcementResult, ExecutionState, GovernanceState, RuntimeEventPayload, RuntimeEventSource } from '../runtimeTypes'
import { isOperatorAuthorized } from '../operators/registry'

type EnforcementInput = {
  action: RuntimeAction
  governanceState: GovernanceState
  executionState: ExecutionState
  authority: AuthorityLevel
  traceId?: string
  correlationId?: string
  lineageId?: string
  source?: RuntimeEventSource
  operatorId?: string
  previousAction?: RuntimeAction
  twoKey?: {
    required: boolean
    approvedBy?: string[]
    minimumApprovers?: number
  }
  nilProtection?: {
    protected: boolean
    reason?: string
  }
}

function isGovernanceBlock(governanceState: GovernanceState, reason?: string) {
  return governanceState === 'blocked' || Boolean(reason?.includes('governance state'))
}

function requiresTwoKey(input: EnforcementInput) {
  return input.twoKey?.required === true
}

function twoKeySatisfied(input: EnforcementInput) {
  if (!requiresTwoKey(input)) return true
  const approvedBy = input.twoKey?.approvedBy ?? []
  const minimumApprovers = input.twoKey?.minimumApprovers ?? 2
  return approvedBy.length >= minimumApprovers
}

async function emitEnforcementEvent(
  type: 'governance.blocked' | 'execution.denied' | 'escalation.triggered',
  input: EnforcementInput,
  payloadType: string,
  payload: RuntimeEventPayload,
) {
  return emitRuntimeEvent({
    type,
    source: input.source ?? 'operator',
    governanceState: input.governanceState,
    executionState: input.executionState,
    traceId: input.traceId,
    correlationId: input.correlationId,
    lineageId: input.lineageId,
    payloadType,
    payload,
  })
}

export async function enforceRuntimeAction(input: EnforcementInput): Promise<EnforcementResult> {
  const legality = evaluateActionLegality({
    action: input.action,
    governanceState: input.governanceState,
    executionState: input.executionState,
    authority: input.authority,
    previousAction: input.previousAction,
  })
  const emittedEventIds: string[] = []
  const operatorAuthorized = input.operatorId
    ? isOperatorAuthorized({
        operatorId: input.operatorId,
        action: input.action,
        authority: input.authority,
        governanceState: input.governanceState,
      })
    : true
  const nilProtected = input.nilProtection?.protected === true
  const nilReason = nilProtected ? input.nilProtection?.reason ?? 'NIL protection engaged.' : undefined
  const twoKeyOk = twoKeySatisfied(input)
  const shouldBlockForScaffolding = !operatorAuthorized || !twoKeyOk || nilProtected

  if (legality.allowed && !shouldBlockForScaffolding) {
    return { allowed: true, emittedEventIds }
  }

  const denialReason =
    (!operatorAuthorized && `Operator ${input.operatorId} is not authorized for ${input.action}.`) ||
    (!twoKeyOk && `Two-Key approval missing for ${input.action}.`) ||
    nilReason ||
    legality.denialReason ||
    `Execution denied for ${input.action}.`
  const governanceBlocked = isGovernanceBlock(input.governanceState, denialReason) || !twoKeyOk || nilProtected

  const denied = await emitEnforcementEvent('execution.denied', input, 'enforcement.result', {
    action: input.action,
    operatorId: input.operatorId,
    requiredAuthority: legality.requiredAuthority,
    denialReason,
    twoKeyRequired: requiresTwoKey(input),
    approvedBy: input.twoKey?.approvedBy ?? [],
    nilProtected,
  })
  emittedEventIds.push(denied.id)

  if (governanceBlocked) {
    const blocked = await emitEnforcementEvent('governance.blocked', input, 'enforcement.governance', {
      action: input.action,
      operatorId: input.operatorId,
      requiredAuthority: legality.requiredAuthority,
      denialReason,
      governanceState: input.governanceState,
      twoKeyRequired: requiresTwoKey(input),
      nilProtected,
    })
    emittedEventIds.push(blocked.id)
  }

  if (legality.escalationRequired || !twoKeyOk || nilProtected) {
    const escalation = await emitEnforcementEvent('escalation.triggered', input, 'enforcement.escalation', {
      action: input.action,
      operatorId: input.operatorId,
      reason: denialReason,
      escalationPath: ['garvis-enforcement', 'runtime-governance-lead', 'sovereign-authority'],
      twoKeyRequired: requiresTwoKey(input),
      approvedBy: input.twoKey?.approvedBy ?? [],
      nilProtected,
    })
    emittedEventIds.push(escalation.id)
  }

  return {
    allowed: false,
    reason: denialReason,
    emittedEventIds,
  }
}
