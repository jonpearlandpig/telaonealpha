import type { OperationalStateCode, OperationalStateSeverity } from './model'

// TEMP HEURISTIC LAYER

export function inferHeuristicState(input: {
  label: string
  directBlockers: number
  chainDepth: number
  pendingGovernance: number
  escalations: number
}) {
  const label = input.label.toLowerCase()

  if (input.directBlockers > 0 || input.chainDepth > 1) {
    return state('UNRESOLVED_DEPENDENCY', 'critical', '⛔')
  }

  if (input.escalations > 0 || input.pendingGovernance > 1) {
    return state('ESCALATION_RISK', 'high', '🔴')
  }

  if (label.includes('commitment') || label.includes('approval') || label.includes('awaiting')) {
    return state('AWAITING_COMMITMENT', 'high', '⏳')
  }

  if (label.includes('budget') || label.includes('fund') || label.includes('payment') || label.includes('deposit')) {
    return state('FINANCING_GATE', 'high', '🔴')
  }

  if (label.includes('routing') || label.includes('venue') || label.includes('city') || label.includes('travel')) {
    return state('ROUTING_PENDING', 'medium', '🗺️')
  }

  if (label.includes('ready') || label.includes('approved') || label.includes('build')) {
    return state('READY_TO_ADVANCE', 'low', '🟢')
  }

  if (label.includes('moving') || label.includes('progress') || label.includes('active')) {
    return state('ACTIVELY_MOVING', 'medium', '🟡')
  }

  return state('STALE_PRESSURE', 'medium', '🟡')
}

function state(
  code: OperationalStateCode,
  severity: OperationalStateSeverity,
  emoji: string,
) {
  return { code, severity, emoji }
}
