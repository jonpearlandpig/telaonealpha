import { ACTIONS, AUTHORITY_RANK, type AuthorityLevel, type RuntimeAction } from '../actions'
import type { ExecutionState, GovernanceState, LegalityCheckInput, LegalityCheckResult } from '../runtimeTypes'

type ActionPolicy = {
  requiredAuthority: AuthorityLevel
  allowedGovernanceStates: GovernanceState[]
  blockedExecutionStates?: ExecutionState[]
  allowedNextActions: RuntimeAction[]
}

const DEFAULT_NEXT_ACTIONS: RuntimeAction[] = [
  ACTIONS.UPDATE_ENTITY,
  ACTIONS.CREATE_UNRESOLVED,
  ACTIONS.GENERATE_REPORT,
]

const LEGAL_MOVEMENTS: Partial<Record<RuntimeAction, RuntimeAction[]>> = {
  [ACTIONS.INGEST_CONTINUITY]: [ACTIONS.UPDATE_ENTITY, ACTIONS.CREATE_UNRESOLVED, ACTIONS.PROMOTE_INBOX],
  [ACTIONS.UPDATE_ENTITY]: DEFAULT_NEXT_ACTIONS,
  [ACTIONS.CREATE_UNRESOLVED]: [ACTIONS.RESOLVE_UNRESOLVED, ACTIONS.GENERATE_REPORT],
  [ACTIONS.PROMOTE_INBOX]: [ACTIONS.INGEST_CONTINUITY, ACTIONS.UPDATE_ENTITY],
  [ACTIONS.SCHEDULE_MEETING]: [ACTIONS.CONFIRM_STAFFING, ACTIONS.GENERATE_CALL_SHEET],
  [ACTIONS.CONFIRM_STAFFING]: [ACTIONS.GENERATE_CALL_SHEET, ACTIONS.EXECUTE_OPERATIONAL_ACTION],
  [ACTIONS.INITIATE_VENUE_BRIEF]: [ACTIONS.GENERATE_CALL_SHEET, ACTIONS.GENERATE_REPORT],
  [ACTIONS.GENERATE_CALL_SHEET]: [ACTIONS.CONFIRM_STAFFING, ACTIONS.EXECUTE_OPERATIONAL_ACTION],
  [ACTIONS.ACTIVATE_FLUENCY_PARTNER]: [ACTIONS.EXECUTE_OPERATIONAL_ACTION, ACTIONS.GENERATE_REPORT],
  [ACTIONS.RESOLVE_UNRESOLVED]: [ACTIONS.GENERATE_REPORT, ACTIONS.ARCHIVE_CONTINUITY],
  [ACTIONS.EXECUTE_OPERATIONAL_ACTION]: [ACTIONS.GENERATE_REPORT, ACTIONS.ARCHIVE_CONTINUITY],
  [ACTIONS.GENERATE_REPORT]: [ACTIONS.ARCHIVE_CONTINUITY],
}

const POLICIES: Record<RuntimeAction, ActionPolicy> = {
  [ACTIONS.INGEST_CONTINUITY]: {
    requiredAuthority: 'S0',
    allowedGovernanceStates: ['pending', 'approved'],
    allowedNextActions: [ACTIONS.UPDATE_ENTITY, ACTIONS.CREATE_UNRESOLVED, ACTIONS.PROMOTE_INBOX],
  },
  [ACTIONS.SCHEDULE_MEETING]: {
    requiredAuthority: 'S1',
    allowedGovernanceStates: ['approved'],
    blockedExecutionStates: ['rolled-back'],
    allowedNextActions: [ACTIONS.CONFIRM_STAFFING, ACTIONS.GENERATE_CALL_SHEET],
  },
  [ACTIONS.UPDATE_ENTITY]: {
    requiredAuthority: 'S0',
    allowedGovernanceStates: ['pending', 'approved'],
    allowedNextActions: DEFAULT_NEXT_ACTIONS,
  },
  [ACTIONS.CREATE_UNRESOLVED]: {
    requiredAuthority: 'S0',
    allowedGovernanceStates: ['pending', 'approved'],
    allowedNextActions: [ACTIONS.RESOLVE_UNRESOLVED, ACTIONS.GENERATE_REPORT],
  },
  [ACTIONS.PROMOTE_INBOX]: {
    requiredAuthority: 'S0',
    allowedGovernanceStates: ['pending', 'approved'],
    allowedNextActions: [ACTIONS.INGEST_CONTINUITY, ACTIONS.UPDATE_ENTITY],
  },
  [ACTIONS.CONFIRM_STAFFING]: {
    requiredAuthority: 'S2',
    allowedGovernanceStates: ['approved'],
    allowedNextActions: [ACTIONS.GENERATE_CALL_SHEET, ACTIONS.EXECUTE_OPERATIONAL_ACTION],
  },
  [ACTIONS.INITIATE_VENUE_BRIEF]: {
    requiredAuthority: 'S1',
    allowedGovernanceStates: ['approved'],
    allowedNextActions: [ACTIONS.GENERATE_CALL_SHEET, ACTIONS.GENERATE_REPORT],
  },
  [ACTIONS.GENERATE_CALL_SHEET]: {
    requiredAuthority: 'S1',
    allowedGovernanceStates: ['approved'],
    allowedNextActions: [ACTIONS.CONFIRM_STAFFING, ACTIONS.EXECUTE_OPERATIONAL_ACTION],
  },
  [ACTIONS.ACTIVATE_FLUENCY_PARTNER]: {
    requiredAuthority: 'S1',
    allowedGovernanceStates: ['approved'],
    allowedNextActions: [ACTIONS.EXECUTE_OPERATIONAL_ACTION, ACTIONS.GENERATE_REPORT],
  },
  [ACTIONS.RESOLVE_UNRESOLVED]: {
    requiredAuthority: 'S1',
    allowedGovernanceStates: ['approved'],
    allowedNextActions: [ACTIONS.GENERATE_REPORT, ACTIONS.ARCHIVE_CONTINUITY],
  },
  [ACTIONS.EXECUTE_OPERATIONAL_ACTION]: {
    requiredAuthority: 'S2',
    allowedGovernanceStates: ['approved'],
    blockedExecutionStates: ['rolled-back', 'failed'],
    allowedNextActions: [ACTIONS.GENERATE_REPORT, ACTIONS.ARCHIVE_CONTINUITY],
  },
  [ACTIONS.GENERATE_REPORT]: {
    requiredAuthority: 'S0',
    allowedGovernanceStates: ['approved', 'escalated'],
    allowedNextActions: [ACTIONS.ARCHIVE_CONTINUITY],
  },
  [ACTIONS.ARCHIVE_CONTINUITY]: {
    requiredAuthority: 'S1',
    allowedGovernanceStates: ['approved', 'escalated'],
    allowedNextActions: [],
  },
}

export function evaluateActionLegality(input: LegalityCheckInput): LegalityCheckResult {
  const policy = POLICIES[input.action]

  if (input.governanceState === 'blocked') {
    return {
      allowed: false,
      governanceState: input.governanceState,
      executionState: input.executionState,
      action: input.action,
      requiredAuthority: policy.requiredAuthority,
      allowedNextActions: policy.allowedNextActions,
      escalationRequired: true,
      denialReason: `${input.action} is blocked by governance state ${input.governanceState}.`,
    }
  }

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

  if (input.previousAction) {
    const allowedTransitions = LEGAL_MOVEMENTS[input.previousAction] ?? []
    if (!allowedTransitions.includes(input.action)) {
      return {
        allowed: false,
        governanceState: input.governanceState,
        executionState: input.executionState,
        action: input.action,
        requiredAuthority: policy.requiredAuthority,
        allowedNextActions: allowedTransitions,
        escalationRequired: false,
        denialReason: `${input.action} is not a legal movement after ${input.previousAction}.`,
      }
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
      escalationRequired: input.governanceState === 'escalated',
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
