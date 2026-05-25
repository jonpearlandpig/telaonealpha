import { ACTIONS, AUTHORITY_RANK, type AuthorityLevel, type RuntimeAction } from '../actions'
import type { LegalityCheckInput, LegalityCheckResult } from '../runtimeTypes'

type ActionPolicy = {
  requiredAuthority: AuthorityLevel
  allowedGovernanceStates: string[]
  blockedExecutionStates?: string[]
  allowedNextActions: RuntimeAction[]
}

const DEFAULT_NEXT_ACTIONS: RuntimeAction[] = [
  ACTIONS.UPDATE_ENTITY,
  ACTIONS.CREATE_UNRESOLVED,
  ACTIONS.GENERATE_REPORT,
]

const POLICIES: Record<RuntimeAction, ActionPolicy> = {
  [ACTIONS.INGEST_CONTINUITY]: {
    requiredAuthority: 'S0',
    allowedGovernanceStates: ['exploratory', 'review', 'validated', 'constitutional'],
    allowedNextActions: [ACTIONS.UPDATE_ENTITY, ACTIONS.CREATE_UNRESOLVED, ACTIONS.PROMOTE_INBOX],
  },
  [ACTIONS.SCHEDULE_MEETING]: {
    requiredAuthority: 'S1',
    allowedGovernanceStates: ['review', 'validated', 'constitutional'],
    blockedExecutionStates: ['rolled_back'],
    allowedNextActions: [ACTIONS.CONFIRM_STAFFING, ACTIONS.GENERATE_CALL_SHEET],
  },
  [ACTIONS.UPDATE_ENTITY]: {
    requiredAuthority: 'S0',
    allowedGovernanceStates: ['exploratory', 'review', 'validated', 'constitutional'],
    allowedNextActions: DEFAULT_NEXT_ACTIONS,
  },
  [ACTIONS.CREATE_UNRESOLVED]: {
    requiredAuthority: 'S0',
    allowedGovernanceStates: ['review', 'validated', 'constitutional'],
    allowedNextActions: [ACTIONS.RESOLVE_UNRESOLVED, ACTIONS.GENERATE_REPORT],
  },
  [ACTIONS.PROMOTE_INBOX]: {
    requiredAuthority: 'S0',
    allowedGovernanceStates: ['review', 'validated', 'constitutional'],
    allowedNextActions: [ACTIONS.INGEST_CONTINUITY, ACTIONS.UPDATE_ENTITY],
  },
  [ACTIONS.CONFIRM_STAFFING]: {
    requiredAuthority: 'S2',
    allowedGovernanceStates: ['validated', 'constitutional'],
    allowedNextActions: [ACTIONS.GENERATE_CALL_SHEET, ACTIONS.EXECUTE_OPERATIONAL_ACTION],
  },
  [ACTIONS.INITIATE_VENUE_BRIEF]: {
    requiredAuthority: 'S1',
    allowedGovernanceStates: ['review', 'validated', 'constitutional'],
    allowedNextActions: [ACTIONS.GENERATE_CALL_SHEET, ACTIONS.GENERATE_REPORT],
  },
  [ACTIONS.GENERATE_CALL_SHEET]: {
    requiredAuthority: 'S1',
    allowedGovernanceStates: ['validated', 'constitutional'],
    allowedNextActions: [ACTIONS.CONFIRM_STAFFING, ACTIONS.EXECUTE_OPERATIONAL_ACTION],
  },
  [ACTIONS.ACTIVATE_FLUENCY_PARTNER]: {
    requiredAuthority: 'S1',
    allowedGovernanceStates: ['review', 'validated', 'constitutional'],
    allowedNextActions: [ACTIONS.EXECUTE_OPERATIONAL_ACTION, ACTIONS.GENERATE_REPORT],
  },
  [ACTIONS.RESOLVE_UNRESOLVED]: {
    requiredAuthority: 'S1',
    allowedGovernanceStates: ['validated', 'constitutional'],
    allowedNextActions: [ACTIONS.GENERATE_REPORT, ACTIONS.ARCHIVE_CONTINUITY],
  },
  [ACTIONS.EXECUTE_OPERATIONAL_ACTION]: {
    requiredAuthority: 'S2',
    allowedGovernanceStates: ['constitutional'],
    blockedExecutionStates: ['rolled_back', 'rejected'],
    allowedNextActions: [ACTIONS.GENERATE_REPORT, ACTIONS.ARCHIVE_CONTINUITY],
  },
  [ACTIONS.GENERATE_REPORT]: {
    requiredAuthority: 'S0',
    allowedGovernanceStates: ['review', 'validated', 'constitutional', 'immutable'],
    allowedNextActions: [ACTIONS.ARCHIVE_CONTINUITY],
  },
  [ACTIONS.ARCHIVE_CONTINUITY]: {
    requiredAuthority: 'S1',
    allowedGovernanceStates: ['validated', 'constitutional', 'immutable'],
    allowedNextActions: [],
  },
}

export function evaluateActionLegality(input: LegalityCheckInput): LegalityCheckResult {
  const policy = POLICIES[input.action]

  if (AUTHORITY_RANK[input.authority] < AUTHORITY_RANK[policy.requiredAuthority]) {
    return {
      allowed: false,
      governanceState: input.governanceState,
      executionState: input.executionState,
      action: input.action,
      requiredAuthority: policy.requiredAuthority,
      allowedNextActions: policy.allowedNextActions,
      escalationRequired: true,
      denialReason: `Authority ${input.authority} is below ${policy.requiredAuthority} for ${input.action}.`,
    }
  }

  if (!policy.allowedGovernanceStates.includes(input.governanceState)) {
    return {
      allowed: false,
      governanceState: input.governanceState,
      executionState: input.executionState,
      action: input.action,
      requiredAuthority: policy.requiredAuthority,
      allowedNextActions: policy.allowedNextActions,
      escalationRequired: input.governanceState === 'immutable',
      denialReason: `${input.action} is not legal in governance state ${input.governanceState}.`,
    }
  }

  if (policy.blockedExecutionStates?.includes(input.executionState)) {
    return {
      allowed: false,
      governanceState: input.governanceState,
      executionState: input.executionState,
      action: input.action,
      requiredAuthority: policy.requiredAuthority,
      allowedNextActions: policy.allowedNextActions,
      escalationRequired: false,
      denialReason: `${input.action} is blocked while execution state is ${input.executionState}.`,
    }
  }

  return {
    allowed: true,
    governanceState: input.governanceState,
    executionState: input.executionState,
    action: input.action,
    requiredAuthority: policy.requiredAuthority,
    allowedNextActions: policy.allowedNextActions,
    escalationRequired: false,
  }
}
