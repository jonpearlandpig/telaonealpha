import { ACTIONS, AUTHORITY_RANK, type AuthorityLevel, type RuntimeAction } from '../actions'
import { loadCanonicalRegistry } from '../registry/registryLoader'
import type { OperatorDefinition } from '../runtimeTypes'

const RUNTIME_ACTION_SET = new Set<string>(Object.values(ACTIONS))

function isRuntimeAction(action: string): action is RuntimeAction {
  return RUNTIME_ACTION_SET.has(action)
}

function loadOperatorRegistry(): readonly OperatorDefinition[] {
  return loadCanonicalRegistry().modules
    .filter((module) => module.runtimeClass === 'operator')
    .map((module) => ({
      id: module.id,
      label: module.label,
      domain: module.domain as OperatorDefinition['domain'],
      authorityFloor: module.authorityLevel as AuthorityLevel,
      capabilities: module.allowedActions.filter(isRuntimeAction),
      governanceStates: [...module.governanceStates],
      rollbackCeiling: module.rollbackLevel,
    }))
    .sort((left, right) => left.id.localeCompare(right.id))
}

export const OPERATOR_REGISTRY: readonly OperatorDefinition[] = loadOperatorRegistry()

export function getOperatorsForAction(action: RuntimeAction): OperatorDefinition[] {
  return OPERATOR_REGISTRY.filter((operator) => operator.capabilities.includes(action)).sort((left, right) => left.id.localeCompare(right.id))
}

export function getOperatorById(id: string): OperatorDefinition | undefined {
  return OPERATOR_REGISTRY.find((operator) => operator.id === id)
}

export function getOperatorsByDomain(domain: OperatorDefinition['domain']): OperatorDefinition[] {
  return OPERATOR_REGISTRY.filter((operator) => operator.domain === domain).sort((left, right) => left.id.localeCompare(right.id))
}

export function isAuthorityLevelValid(authority: string): authority is AuthorityLevel {
  return authority in AUTHORITY_RANK
}

export function isOperatorAuthorized(input: {
  operatorId: string
  action: RuntimeAction
  authority: AuthorityLevel
  governanceState: OperatorDefinition['governanceStates'][number]
}) {
  const operator = getOperatorById(input.operatorId)
  if (!operator) return false
  if (!operator.capabilities.includes(input.action)) return false
  if (!operator.governanceStates.includes(input.governanceState)) return false
  return AUTHORITY_RANK[input.authority] >= AUTHORITY_RANK[operator.authorityFloor]
}

export function getRollbackCeiling(operatorId: string): OperatorDefinition['rollbackCeiling'] | undefined {
  return getOperatorById(operatorId)?.rollbackCeiling
}

export function validateOperatorAuthority(operatorId: string, authority: AuthorityLevel) {
  const operator = getOperatorById(operatorId)
  if (!operator) return false
  return AUTHORITY_RANK[authority] >= AUTHORITY_RANK[operator.authorityFloor]
}
