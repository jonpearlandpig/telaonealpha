import { ACTIONS } from '../actions'
import type { GovernanceLegalityState, LineageEdge, OperationalObject, OperationalPriority, OperationalRoutingPlan, OperationalState } from '../operationalState'
import type { ReconstructedOperationalState, RuntimeEvent } from '../runtimeTypes'
import { decisionLabel, deriveOperationalObjects, projectRefs, stringList, stringRecord, stringValue } from './derivedArtifacts'

function scoreForEvent(event: RuntimeEvent): number {
  if (event.type === 'escalation.triggered' || event.type === 'operator.escalated' || event.type === 'governance.escalation.propagated') return 45
  if (event.type === 'runtime.rollback.signaled') return 42
  if (event.type === 'execution.denied' || event.type === 'governance.blocked' || event.type === 'operator.blocked' || event.type === 'governance.nil.blocked' || event.type === 'governance.two-key.blocked') return 40
  if (event.type === 'continuity.normalized') return 30
  if (event.type === 'continuity.ingested') return 24
  if (event.type.includes('unresolved')) return 35
  if (event.executionState === 'queued') return 20
  return 12
}

function priorityReason(event: RuntimeEvent): string {
  if (event.type === 'escalation.triggered' || event.type === 'operator.escalated' || event.type === 'governance.escalation.propagated') return 'governance escalated'
  if (event.type === 'runtime.rollback.signaled') return 'rollback signaled'
  if (event.type.includes('unresolved')) return 'unresolved continuity'
  if (event.type === 'governance.blocked' || event.type === 'operator.blocked') return 'governance blocked'
  if (event.type === 'execution.denied') return 'execution denied'
  if (event.type === 'continuity.normalized') return 'normalized continuity'
  return 'runtime event'
}

function lineageEdgesForEvent(event: RuntimeEvent): LineageEdge[] {
  const payload = stringRecord(event.payload)
  const parentLineageId = stringValue(payload.parentLineageId)
  const relationType = stringValue(payload.relationType) ?? (parentLineageId ? 'lineage-parent' : 'lineage-root')

  if (event.lineageId) {
    return [{
      id: `edge:${event.id}`,
      lineageId: event.lineageId,
      parentLineageId,
      eventId: event.id,
      relationType,
      createdAt: event.createdAt,
    }]
  }

  const lineageRef = stringRecord(payload.lineageRef)
  const lineageId = stringValue(lineageRef.lineageId)
  if (!lineageId) return []

  return [{
    id: `edge:${event.id}`,
    lineageId,
    parentLineageId: stringValue(lineageRef.parentId) ?? parentLineageId,
    eventId: event.id,
    relationType,
    createdAt: event.createdAt,
  }]
}

function routingPlanForEvent(event: RuntimeEvent): OperationalRoutingPlan | null {
  if (event.type !== 'routing.plan.created' && event.type !== 'operator.analysis.completed') return null
  const payload = stringRecord(event.payload)
  const selectedOperators = stringList(payload.selectedOperators)
  const escalationPath = stringList(payload.escalationPath)
  const action = stringValue(payload.action)
  const rollbackClass = stringValue(payload.rollbackClass)
  const governanceState = stringValue(payload.governanceState)
  const legal = payload.legal === true
  const id = stringValue(payload.routingPlanId) ?? event.id

  if (!action || !rollbackClass || !governanceState) return null

  return {
    id,
    action,
    rollbackClass,
    selectedOperators,
    escalationPath,
    governanceState,
    legal,
    lineageId: event.lineageId,
    createdAt: event.createdAt,
  }
}

function governanceLegalityForEvent(event: RuntimeEvent): GovernanceLegalityState | null {
  if (event.type !== 'governance.validated' && event.type !== 'operator.analysis.completed') return null
  const payload = stringRecord(event.payload)
  const action = stringValue(payload.action)
  if (!action) return null

  return {
    action,
    allowed: payload.allowed === true,
    requiredAuthority: stringValue(payload.requiredAuthority),
    denialReason: stringValue(payload.denialReason),
    source: payload.source === 'pen-and-sword' ? 'pen-and-sword' : 'flightpath',
    checkedAt: event.createdAt,
  }
}

export function reconstructOperationalState(events: RuntimeEvent[]): ReconstructedOperationalState {
  return reconstructOperationalStateFromReplay(events)
}

export function reconstructOperationalStateFromReplay(
  events: RuntimeEvent[],
): ReconstructedOperationalState {
  const ordered = [...events].sort((left, right) => (left.replaySequence ?? 0) - (right.replaySequence ?? 0))
  const activeThreads = new Set<string>()
  const activeProjects = new Set<string>()
  const unresolved = new Set<string>()
  const pinnedContinuity = new Set<string>()
  const recentDecisionSet = new Set<string>()
  const entities = new Set<string>()
  const lineage = new Set<string>()
  const staleMemory = new Set<string>()
  const priorities = new Map<string, OperationalPriority>()
  const operationalObjects = new Map<string, OperationalObject>()
  const routingPlans = new Map<string, OperationalRoutingPlan>()
  const lineageGraph = new Map<string, LineageEdge>()
  const governanceLegality = new Map<string, GovernanceLegalityState>()
  let blockedCount = 0
  let deniedCount = 0
  let escalatedCount = 0
  let pendingCount = 0
  let lastEscalationAt: string | undefined

  for (const event of ordered) {
    const payload = event.payload ?? {}
    const threadId = stringValue(payload.threadId)
    const unresolvedId = stringValue(payload.unresolvedId) ?? (event.type === ACTIONS.CREATE_UNRESOLVED ? event.id : undefined)
    const entityId = stringValue(payload.entityId)
    const linkedEntities = stringList(payload.linkedEntities)

    if (threadId) activeThreads.add(threadId)
    for (const projectRef of projectRefs(event)) activeProjects.add(projectRef)
    if (event.lineageId) lineage.add(event.lineageId)
    if (entityId) entities.add(entityId)
    for (const linkedEntity of linkedEntities) entities.add(linkedEntity)
    if (stringValue(payload.pinnedId)) pinnedContinuity.add(stringValue(payload.pinnedId)!)
    if (decisionLabel(event)) recentDecisionSet.add(decisionLabel(event)!)

    if (event.type === ACTIONS.CREATE_UNRESOLVED || event.type === 'continuity.ingested') {
      if (unresolvedId) unresolved.add(unresolvedId)
    }

    if (event.type === ACTIONS.RESOLVE_UNRESOLVED && unresolvedId) {
      unresolved.delete(unresolvedId)
    }

    if (event.type === ACTIONS.ARCHIVE_CONTINUITY && event.lineageId) {
      staleMemory.add(event.lineageId)
    }

    if (event.governanceState === 'pending' || event.executionState === 'queued') {
      pendingCount += 1
    }

    if (event.type === 'governance.blocked' || event.type === 'operator.blocked' || event.type === 'governance.nil.blocked' || event.type === 'governance.two-key.blocked') {
      blockedCount += 1
    }

    if (event.type === 'execution.denied') {
      deniedCount += 1
    }

    if (event.type === 'escalation.triggered' || event.type === 'operator.escalated' || event.type === 'governance.escalation.propagated') {
      escalatedCount += 1
      lastEscalationAt = event.createdAt
    }

    priorities.set(event.id, {
      id: event.id,
      reason: priorityReason(event),
      score: scoreForEvent(event),
    })

    for (const operationalObject of deriveOperationalObjects(event)) {
      const current = operationalObjects.get(operationalObject.id)
      operationalObjects.set(operationalObject.id, current
        ? { ...current, ...operationalObject, payload: { ...current.payload, ...operationalObject.payload }, updatedAt: operationalObject.updatedAt }
        : operationalObject)
    }

    const routingPlan = routingPlanForEvent(event)
    if (routingPlan) routingPlans.set(routingPlan.id, routingPlan)

    const legality = governanceLegalityForEvent(event)
    if (legality) governanceLegality.set(`${legality.source}:${legality.action}:${event.id}`, legality)

    for (const edge of lineageEdgesForEvent(event)) {
      lineageGraph.set(edge.id, edge)
    }
  }

  const state: OperationalState = {
    activeThreads: [...activeThreads],
    activeProjects: [...activeProjects].slice(0, 12),
    unresolvedContinuity: [...unresolved],
    pinnedContinuity: [...pinnedContinuity].slice(0, 12),
    recentDecisions: [...recentDecisionSet].slice(-12),
    activeEntities: [...entities].slice(0, 12),
    recentLineage: [...lineage].slice(-12),
    operationalObjects: [...operationalObjects.values()].sort((left, right) => left.updatedAt.localeCompare(right.updatedAt)).slice(-40),
    routingPlans: [...routingPlans.values()].sort((left, right) => left.createdAt.localeCompare(right.createdAt)).slice(-12),
    lineageGraph: [...lineageGraph.values()].sort((left, right) => left.createdAt.localeCompare(right.createdAt)).slice(-20),
    currentPriorities: [...priorities.values()].sort((left, right) => right.score - left.score).slice(0, 12),
    continuityIntensity: unresolved.size * 10 + Math.min(ordered.length, 25),
    operationalDrift: blockedCount,
    staleImportantMemory: [...staleMemory].slice(0, 12),
    governanceLegality: [...governanceLegality.values()].sort((left, right) => left.checkedAt.localeCompare(right.checkedAt)).slice(-12),
    governanceOutcomes: {
      blocked: blockedCount,
      denied: deniedCount,
      escalated: escalatedCount,
      pending: pendingCount,
      lastEscalationAt,
    },
  }

  return {
    state,
    replayedEventCount: ordered.length,
    lastEventAt: ordered.at(-1)?.createdAt,
    lastReplaySequence: ordered.at(-1)?.replaySequence,
    replaySource: 'events',
  }
}
