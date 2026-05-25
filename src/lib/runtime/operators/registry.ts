import { ACTIONS, type RuntimeAction } from '../actions'
import type { OperatorDefinition } from '../runtimeTypes'

export const OPERATOR_REGISTRY: readonly OperatorDefinition[] = [
  {
    id: 'continuity-operator',
    label: 'Continuity Operator',
    authorityFloor: 'S0',
    capabilities: [ACTIONS.INGEST_CONTINUITY, ACTIONS.PROMOTE_INBOX, ACTIONS.UPDATE_ENTITY, ACTIONS.CREATE_UNRESOLVED],
    governanceStates: ['exploratory', 'review', 'validated', 'constitutional'],
  },
  {
    id: 'flightpath-engine',
    label: 'Flightpath Legality Engine',
    authorityFloor: 'S1',
    capabilities: [ACTIONS.GENERATE_CALL_SHEET, ACTIONS.CONFIRM_STAFFING, ACTIONS.EXECUTE_OPERATIONAL_ACTION],
    governanceStates: ['review', 'validated', 'constitutional'],
  },
  {
    id: 'mose-router',
    label: 'MOSE Router',
    authorityFloor: 'S1',
    capabilities: [ACTIONS.SCHEDULE_MEETING, ACTIONS.INITIATE_VENUE_BRIEF, ACTIONS.ACTIVATE_FLUENCY_PARTNER],
    governanceStates: ['review', 'validated', 'constitutional'],
  },
  {
    id: 'garvis-enforcement',
    label: 'GARVIS Enforcement',
    authorityFloor: 'S2',
    capabilities: [ACTIONS.RESOLVE_UNRESOLVED, ACTIONS.GENERATE_REPORT, ACTIONS.ARCHIVE_CONTINUITY],
    governanceStates: ['validated', 'constitutional', 'immutable'],
  },
]

export function getOperatorsForAction(action: RuntimeAction): OperatorDefinition[] {
  return OPERATOR_REGISTRY.filter((operator) => operator.capabilities.includes(action))
}
