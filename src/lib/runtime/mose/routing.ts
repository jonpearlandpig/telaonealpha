import crypto from 'crypto'

import { AUTHORITY_RANK, type AuthorityLevel, type RuntimeAction } from '../actions'
import { evaluateActionLegality } from '../flightpath/legalityEngine'
import { getOperatorsForAction } from '../operators/registry'
import type { RoutingPlan } from '../runtimeTypes'

type RoutingInput = {
  action: RuntimeAction
  governanceState: string
  executionState: string
  authority: AuthorityLevel
}

function rollbackClassFor(action: RuntimeAction): RoutingPlan['rollbackClass'] {
  if (action === 'archive.continuity' || action === 'execute.operational-action') return 'hard'
  if (action === 'generate.report') return 'none'
  return 'soft'
}

export function createRoutingPlan(input: RoutingInput): RoutingPlan {
  const legality = evaluateActionLegality(input)
  const selectedOperators = getOperatorsForAction(input.action)
    .filter((operator) => AUTHORITY_RANK[operator.authorityFloor] <= AUTHORITY_RANK[input.authority])
    .filter((operator) => operator.governanceStates.includes(input.governanceState))
    .sort((left, right) => {
      const authorityDelta = AUTHORITY_RANK[left.authorityFloor] - AUTHORITY_RANK[right.authorityFloor]
      return authorityDelta !== 0 ? authorityDelta : left.id.localeCompare(right.id)
    })

  const escalationPath = legality.allowed
    ? ['mose-router', 'flightpath-engine', 'garvis-enforcement']
    : ['mose-router', 'garvis-enforcement', 'runtime-governance-lead']

  return {
    id: crypto.randomUUID(),
    selectedOperators: selectedOperators.map((operator) => operator.id),
    sequence: selectedOperators.map((operator, index) => ({
      order: index + 1,
      operatorId: operator.id,
      action: input.action,
    })),
    rollbackClass: rollbackClassFor(input.action),
    escalationPath,
    governanceState: input.governanceState,
  }
}
