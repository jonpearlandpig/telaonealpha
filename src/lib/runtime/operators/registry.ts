import { ACTIONS, AUTHORITY_RANK, type AuthorityLevel, type RuntimeAction } from '../actions'
import type { OperatorDefinition } from '../runtimeTypes'

export const OPERATOR_REGISTRY: readonly OperatorDefinition[] = [
  {
    id: 'continuity-operator',
    label: 'Continuity Operator',
    domain: 'continuity',
    authorityFloor: 'S0',
    capabilities: [ACTIONS.INGEST_CONTINUITY, ACTIONS.PROMOTE_INBOX, ACTIONS.UPDATE_ENTITY, ACTIONS.CREATE_UNRESOLVED],
    governanceStates: ['pending', 'approved'],
    rollbackCeiling: 'soft',
  },
  {
    id: 'flightpath-engine',
    label: 'Flightpath Legality Engine',
    domain: 'flightpath',
    authorityFloor: 'S1',
    capabilities: [ACTIONS.GENERATE_CALL_SHEET, ACTIONS.CONFIRM_STAFFING, ACTIONS.EXECUTE_OPERATIONAL_ACTION],
    governanceStates: ['approved', 'escalated'],
    rollbackCeiling: 'hard',
  },
  {
    id: 'mose-router',
    label: 'MOSE Router',
    domain: 'mose',
    authorityFloor: 'S1',
    capabilities: [ACTIONS.SCHEDULE_MEETING, ACTIONS.INITIATE_VENUE_BRIEF, ACTIONS.ACTIVATE_FLUENCY_PARTNER],
    governanceStates: ['approved', 'escalated'],
    rollbackCeiling: 'soft',
  },
  {
    id: 'garvis-enforcement',
    label: 'GARVIS Enforcement',
    domain: 'garvis',
    authorityFloor: 'S2',
    capabilities: [ACTIONS.RESOLVE_UNRESOLVED, ACTIONS.GENERATE_REPORT, ACTIONS.ARCHIVE_CONTINUITY],
    governanceStates: ['approved', 'blocked', 'escalated'],
    rollbackCeiling: 'hard',
  },
]

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
