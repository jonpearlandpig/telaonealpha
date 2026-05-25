import { emitRuntimeEvent } from '../eventBus'
import { evaluateActionLegality } from '../flightpath/legalityEngine'
import type { AuthorityLevel, RuntimeAction } from '../actions'
import type { EnforcementResult } from '../runtimeTypes'

type EnforcementInput = {
  action: RuntimeAction
  governanceState: string
  executionState: string
  authority: AuthorityLevel
  traceId?: string
  correlationId?: string
  lineageId?: string
  source?: 'user' | 'system' | 'operator' | 'automation'
}

export async function enforceRuntimeAction(input: EnforcementInput): Promise<EnforcementResult> {
  const legality = evaluateActionLegality(input)
  const emittedEventIds: string[] = []

  if (legality.allowed) {
    return { allowed: true, emittedEventIds }
  }

  const blockType = input.governanceState === 'immutable' || legality.denialReason?.includes('governance state')
    ? 'governance.blocked'
    : 'execution.denied'

  const blocked = await emitRuntimeEvent({
    type: blockType,
    source: input.source ?? 'operator',
    governanceState: input.governanceState,
    executionState: input.executionState,
    traceId: input.traceId,
    correlationId: input.correlationId,
    lineageId: input.lineageId,
    payloadType: 'enforcement.result',
    payload: {
      action: input.action,
      requiredAuthority: legality.requiredAuthority,
      denialReason: legality.denialReason,
    },
  })
  emittedEventIds.push(blocked.id)

  if (legality.escalationRequired) {
    const escalation = await emitRuntimeEvent({
      type: 'escalation.triggered',
      source: input.source ?? 'operator',
      governanceState: input.governanceState,
      executionState: input.executionState,
      traceId: input.traceId,
      correlationId: input.correlationId,
      lineageId: input.lineageId,
      payloadType: 'enforcement.escalation',
      payload: {
        action: input.action,
        reason: legality.denialReason,
        escalationPath: ['garvis-enforcement', 'runtime-governance-lead', 'sovereign-authority'],
      },
    })
    emittedEventIds.push(escalation.id)
  }

  return {
    allowed: false,
    reason: legality.denialReason,
    emittedEventIds,
  }
}
