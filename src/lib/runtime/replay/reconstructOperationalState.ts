import { ACTIONS } from '../actions'
import type { OperationalObject, OperationalPriority, OperationalState } from '../operationalState'
import type { ReconstructedOperationalState, RuntimeEvent } from '../runtimeTypes'

function scoreForEvent(event: RuntimeEvent): number {
  if (event.type === 'escalation.triggered') return 45
  if (event.type === 'execution.denied' || event.type === 'governance.blocked') return 40
  if (event.type === 'continuity.normalized') return 30
  if (event.type === 'continuity.ingested') return 24
  if (event.type.includes('unresolved')) return 35
  if (event.executionState === 'queued') return 20
  return 12
}

function priorityReason(event: RuntimeEvent): string {
  if (event.type === 'escalation.triggered') return 'governance escalated'
  if (event.type.includes('unresolved')) return 'unresolved continuity'
  if (event.type === 'governance.blocked') return 'governance blocked'
  if (event.type === 'execution.denied') return 'execution denied'
  if (event.type === 'continuity.normalized') return 'normalized continuity'
  return 'runtime event'
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function stringRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function projectRefs(event: RuntimeEvent): string[] {
  const payload = event.payload ?? {}
  const directProject = stringValue(payload.projectId)
  const projectIds = stringList(payload.projectIds)
  const linkedProjects = stringList(payload.linkedEntities).filter((value) => /project|show|tour|crusade|venue/i.test(value))
  return Array.from(new Set([directProject, ...projectIds, ...linkedProjects].filter(Boolean) as string[]))
}

function decisionLabel(event: RuntimeEvent): string | undefined {
  const payload = event.payload ?? {}
  const headline = stringValue(payload.normalizedHeadline) ?? stringValue(payload.headline) ?? stringValue(payload.title)
  if (headline) return headline
  if (event.governanceState === 'approved' && event.executionState === 'completed') return event.type
  return undefined
}

function deriveOperationalObjects(event: RuntimeEvent): OperationalObject[] {
  const payload = stringRecord(event.payload)
  const createdAt = event.createdAt
  const objects: OperationalObject[] = []
  const threadId = stringValue(payload.threadId)

  if (threadId) {
    objects.push({
      id: `thread:${threadId}`,
      objectType: 'continuity-thread',
      lineageId: event.lineageId,
      status: event.type === ACTIONS.ARCHIVE_CONTINUITY ? 'archived' : 'active',
      createdAt,
      updatedAt: createdAt,
      payload: {
        threadId,
        eventType: event.type,
        payloadType: event.payloadType,
      },
    })
  }

  if (event.type === 'governance.blocked' || event.type === 'execution.denied' || event.type === 'escalation.triggered') {
    objects.push({
      id: `governance:${event.lineageId ?? event.id}`,
      objectType: 'governance',
      lineageId: event.lineageId,
      status: event.type.replace('.', '-'),
      createdAt,
      updatedAt: createdAt,
      payload: {
        type: event.type,
        traceId: event.traceId,
        correlationId: event.correlationId,
      },
    })
  }

  for (const entityId of [stringValue(payload.entityId), ...stringList(payload.linkedEntities)].filter(Boolean) as string[]) {
    objects.push({
      id: `entity:${entityId}`,
      objectType: 'entity',
      lineageId: event.lineageId,
      status: 'active',
      createdAt,
      updatedAt: createdAt,
      payload: {
        entityId,
        threadId,
      },
    })
  }

  const decision = decisionLabel(event)
  if (decision) {
    objects.push({
      id: `decision:${event.id}`,
      objectType: 'decision',
      lineageId: event.lineageId,
      status: `${event.governanceState}:${event.executionState}`,
      createdAt,
      updatedAt: createdAt,
      payload: {
        decision,
        payloadType: event.payloadType,
      },
    })
  }

  return objects
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

    if (event.type === 'governance.blocked') {
      blockedCount += 1
    }

    if (event.type === 'execution.denied') {
      deniedCount += 1
    }

    if (event.type === 'escalation.triggered') {
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
    currentPriorities: [...priorities.values()].sort((left, right) => right.score - left.score).slice(0, 12),
    continuityIntensity: unresolved.size * 10 + Math.min(ordered.length, 25),
    operationalDrift: blockedCount,
    staleImportantMemory: [...staleMemory].slice(0, 12),
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
