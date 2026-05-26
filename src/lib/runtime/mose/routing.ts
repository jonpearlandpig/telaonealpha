import crypto from 'crypto'

import { ACTIONS, AUTHORITY_RANK, type AuthorityLevel, type RuntimeAction } from '../actions'
import { evaluateActionLegality } from '../flightpath/legalityEngine'
import { getOperatorsByDomain, getOperatorsForAction, getRollbackCeiling, isOperatorAuthorized } from '../operators/registry'
import type { ExecutionState, GovernanceState, RoutingPlan } from '../runtimeTypes'

type RoutingInput = {
  action: RuntimeAction
  governanceState: GovernanceState
  executionState: ExecutionState
  authority: AuthorityLevel
  previousAction?: RuntimeAction
}

function rollbackClassFor(action: RuntimeAction): RoutingPlan['rollbackClass'] {
  if (action === ACTIONS.ARCHIVE_CONTINUITY || action === ACTIONS.EXECUTE_OPERATIONAL_ACTION) return 'hard'
  if (action === ACTIONS.GENERATE_REPORT) return 'none'
  return 'soft'
}

export function createRoutingPlan(input: RoutingInput): RoutingPlan {
  const legality = evaluateActionLegality({
    action: input.action,
    governanceState: input.governanceState,
    executionState: input.executionState,
    authority: input.authority,
    previousAction: input.previousAction,
  })
  const targetRollbackClass = rollbackClassFor(input.action)
  const selectedOperators = getOperatorsForAction(input.action)
    .filter((operator) =>
      isOperatorAuthorized({
        operatorId: operator.id,
        action: input.action,
        authority: input.authority,
        governanceState: input.governanceState,
      }),
    )
    .filter((operator) => {
      const ceiling = getRollbackCeiling(operator.id)
      if (!ceiling) return false
      if (targetRollbackClass === 'hard') return ceiling === 'hard'
      if (targetRollbackClass === 'soft') return ceiling === 'soft' || ceiling === 'hard'
      return true
    })
    .sort((left, right) => {
      const authorityDelta = AUTHORITY_RANK[left.authorityFloor] - AUTHORITY_RANK[right.authorityFloor]
      if (authorityDelta !== 0) return authorityDelta
      const domainDelta = left.domain.localeCompare(right.domain)
      return domainDelta !== 0 ? domainDelta : left.id.localeCompare(right.id)
    })

  const governanceSequence = legality.allowed
    ? getOperatorsByDomain('mose')
    : [...getOperatorsByDomain('mose'), ...getOperatorsByDomain('garvis')]
  const escalationPath = legality.allowed
    ? ['mose-router', 'flightpath-engine', 'garvis-enforcement']
    : ['mose-router', 'garvis-enforcement', 'runtime-governance-lead', 'sovereign-authority']
  const sequenceOperators = legality.allowed
    ? selectedOperators
    : governanceSequence.filter((operator) => selectedOperators.some((selected) => selected.id === operator.id) || operator.domain === 'garvis')

  return {
    id: crypto.randomUUID(),
    selectedOperators: sequenceOperators.map((operator) => operator.id),
    sequence: sequenceOperators.map((operator, index) => ({
      order: index + 1,
      operatorId: operator.id,
      action: input.action,
    })),
    rollbackClass: targetRollbackClass,
    escalationPath,
    governanceState: input.governanceState,
  }
}
