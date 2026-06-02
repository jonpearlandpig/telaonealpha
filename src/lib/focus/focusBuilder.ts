import type { OperationalProjection, OperationalStateRecord, OperationalStateSeverity } from '@/lib/runtime/state/model'
import type { FocusItem, FocusEngineResult } from './types'

export function mapSeverityToImpact(severity: OperationalStateSeverity | string): number {
  switch (severity) {
    case 'critical': return 100
    case 'high': return 75
    case 'medium': return 50
    case 'low': return 25
    default: return 0
  }
}

export function computePressureFromState(state: OperationalStateRecord): number {
  const severityBase =
    state.severity === 'critical' ? 30 :
    state.severity === 'high' ? 20 :
    state.severity === 'medium' ? 10 : 5

  const escalationBonus = state.lifecycle === 'escalated' ? 10 : 0

  const stateCodeBonus =
    state.stateCode === 'UNRESOLVED_DEPENDENCY' || state.stateCode === 'GOVERNANCE_BLOCKED' ? 10 : 0

  return Math.min(50, severityBase + escalationBonus + stateCodeBonus)
}

export function computeTimeSensitivity(nextShowDate: Date | null, now: Date = new Date()): number {
  if (!nextShowDate) return 0
  const diffMs = nextShowDate.getTime() - now.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  if (diffDays <= 0) return 0
  if (diffDays <= 3) return 50
  if (diffDays <= 7) return 25
  if (diffDays <= 14) return 10
  return 0
}

export function computeDependencyWeight(state: OperationalStateRecord): number {
  const isCriticalBlocker =
    state.severity === 'critical' &&
    (state.stateCode === 'UNRESOLVED_DEPENDENCY' ||
      state.stateCode === 'GOVERNANCE_BLOCKED' ||
      state.dependencyIds.length > 0)

  const isBlocked =
    state.stateCode === 'UNRESOLVED_DEPENDENCY' ||
    state.stateCode === 'GOVERNANCE_BLOCKED' ||
    state.dependencyIds.length > 0

  const baseWeight = isCriticalBlocker ? 50 : isBlocked ? 25 : 0
  const multiEntityBonus = state.dependencyIds.length > 1 ? 10 : 0

  return baseWeight + multiEntityBonus
}

export function resolveOwner(state: OperationalStateRecord): { owner: string; ownerId: string } {
  if (state.resolutionOwner && state.resolutionOwner.trim()) {
    return { owner: state.resolutionOwner, ownerId: state.entityId }
  }
  if (state.entityType === 'person' || state.entityType === 'entity') {
    return { owner: state.entityName || 'Unassigned', ownerId: state.entityId }
  }
  if (state.entityType && state.entityType.trim()) {
    return { owner: state.entityType, ownerId: state.entityId }
  }
  return { owner: 'Unassigned', ownerId: state.entityId }
}

export function resolveRecommendedAction(state: OperationalStateRecord): string {
  const name = state.entityName.toLowerCase()
  const detail = `${state.triggerDetail} ${state.explanation ?? ''}`.toLowerCase()

  if (/\brf\b/.test(name) || /\brf\b/.test(detail) || name.includes('rf approval') || detail.includes('rf approval')) {
    return 'Request RF approval'
  }
  if (name.includes('rider')) return 'Follow up with venue regarding rider acceptance'
  if (name.includes('roster') || name.includes('staffing') || name.includes('open role')) return 'Assign open role to complete roster'
  if (name.includes('contract') && !name.includes('sub-contract')) return 'Obtain signed contract'
  if (name.includes('deposit') || (name.includes('payment') && !name.includes('confirm'))) return 'Confirm deposit payment'
  if ((name.includes('venue') || name.includes('advance')) && name.includes('advance')) return 'Complete venue advance'
  if (name.includes('hotel') || name.includes('accommodation')) return 'Confirm hotel accommodations'
  if (name.includes('catering') || name.includes('hospitality')) return 'Confirm catering and hospitality requirements'
  if (name.includes('production') && name.includes('approval')) return 'Obtain production approval'
  if (name.includes('travel') && name.includes('routing')) return 'Confirm routing and travel arrangements'

  switch (state.stateCode) {
    case 'UNRESOLVED_DEPENDENCY':
      return state.resolutionAction ?? 'Resolve the active dependency chain blocking progress'
    case 'GOVERNANCE_BLOCKED':
      return 'Resolve governance blockage to unblock progress'
    case 'AWAITING_COMMITMENT':
      return 'Request commitment or approval to advance'
    case 'FINANCING_GATE':
      return 'Advance financing approval to clear gate'
    case 'ROUTING_PENDING':
      return 'Confirm routing and travel arrangements'
    case 'ESCALATION_RISK':
      return 'Escalate before risk materializes'
    case 'ACTIVELY_MOVING':
      return 'Confirm advancement and clear any emerging blocks'
    case 'READY_TO_ADVANCE':
      return 'Authorize and execute the next operational step'
    case 'STALE_PRESSURE':
      return 'Review stale dependencies and clear or reassign'
    default:
      return 'Investigate and resolve outstanding dependency'
  }
}

function buildFocusItem(state: OperationalStateRecord, nextShowDate: Date | null, now?: Date): FocusItem {
  const impact = mapSeverityToImpact(state.severity)
  const pressure = computePressureFromState(state)
  const timeSensitivity = computeTimeSensitivity(nextShowDate, now)
  const dependencyWeight = computeDependencyWeight(state)
  const { owner, ownerId } = resolveOwner(state)

  return {
    id: state.stateId,
    title: state.entityName,
    owner,
    ownerId,
    priorityScore: impact + pressure + dependencyWeight + timeSensitivity,
    impactScore: impact,
    timeSensitivity,
    dependencyWeight,
    pressureScore: pressure,
    reason: state.explanation ?? state.triggerDetail,
    recommendedAction: resolveRecommendedAction(state),
    linkedEntities: state.dependencyIds,
    sourceIds: state.sourceEventIds ?? [],
  }
}

function gatherCandidates(projection: OperationalProjection): OperationalStateRecord[] {
  const seen = new Set<string>()
  const candidates: OperationalStateRecord[] = []

  function add(state: OperationalStateRecord) {
    if (seen.has(state.stateId)) return
    seen.add(state.stateId)
    candidates.push(state)
  }

  for (const state of projection.blockers) add(state)
  for (const state of projection.escalations) add(state)
  for (const state of projection.states) {
    if (state.severity === 'critical' || state.severity === 'high') add(state)
  }

  return candidates.filter(
    (s) => s.stateCode !== 'READY_TO_ADVANCE' && s.stateCode !== 'ACTIVELY_MOVING',
  )
}

export function buildFocusEngine(
  projection: OperationalProjection,
  nextShowDate: Date | null = null,
  now?: Date,
): FocusEngineResult {
  const candidates = gatherCandidates(projection)

  const allFocusItems = candidates
    .map((state) => buildFocusItem(state, nextShowDate, now))
    .sort((a, b) => b.priorityScore - a.priorityScore)

  const topFocus = allFocusItems[0] ?? null
  const secondaryFocus = allFocusItems[1] ?? null

  return { topFocus, secondaryFocus, allFocusItems }
}
