import type { OperationalPriority, OperationalState } from '../operationalState'
import type { ReconstructedOperationalState, RuntimeEvent } from '../runtimeTypes'

function eventTime(event: RuntimeEvent) {
  return new Date(event.createdAt).getTime()
}

function scoreForEvent(event: RuntimeEvent): number {
  if (event.type === 'execution.denied' || event.type === 'governance.blocked') return 40
  if (event.type === 'continuity.normalized') return 30
  if (event.type === 'continuity.ingested') return 24
  if (event.type.includes('unresolved')) return 35
  if (event.executionState === 'active') return 20
  return 12
}

function priorityReason(event: RuntimeEvent): string {
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

export function reconstructOperationalState(events: RuntimeEvent[]): ReconstructedOperationalState {
  const ordered = [...events].sort((left, right) => eventTime(left) - eventTime(right) || left.id.localeCompare(right.id))
  const activeThreads = new Set<string>()
  const unresolved = new Set<string>()
  const entities = new Set<string>()
  const lineage = new Set<string>()
  const staleMemory = new Set<string>()
  const priorities = new Map<string, OperationalPriority>()
  let blockedCount = 0

  for (const event of ordered) {
    const payload = event.payload ?? {}
    const threadId = stringValue(payload.threadId)
    const unresolvedId = stringValue(payload.unresolvedId) ?? (event.type === 'create.unresolved' ? event.id : undefined)
    const entityId = stringValue(payload.entityId)
    const linkedEntities = stringList(payload.linkedEntities)

    if (threadId) activeThreads.add(threadId)
    if (event.lineageId) lineage.add(event.lineageId)
    if (entityId) entities.add(entityId)
    for (const linkedEntity of linkedEntities) entities.add(linkedEntity)

    if (event.type === 'create.unresolved' || event.type === 'continuity.ingested') {
      if (unresolvedId) unresolved.add(unresolvedId)
    }

    if (event.type === 'resolve.unresolved' && unresolvedId) {
      unresolved.delete(unresolvedId)
    }

    if (event.type === 'archive.continuity' && event.lineageId) {
      staleMemory.add(event.lineageId)
    }

    if (event.type === 'governance.blocked' || event.type === 'execution.denied') {
      blockedCount += 1
    }

    priorities.set(event.id, {
      id: event.id,
      reason: priorityReason(event),
      score: scoreForEvent(event),
    })
  }

  const state: OperationalState = {
    activeThreads: [...activeThreads],
    unresolvedContinuity: [...unresolved],
    activeEntities: [...entities].slice(0, 12),
    recentLineage: [...lineage].slice(-12),
    currentPriorities: [...priorities.values()].sort((left, right) => right.score - left.score).slice(0, 12),
    continuityIntensity: unresolved.size * 10 + Math.min(ordered.length, 25),
    operationalDrift: blockedCount,
    staleImportantMemory: [...staleMemory].slice(0, 12),
  }

  return {
    state,
    replayedEventCount: ordered.length,
    lastEventAt: ordered.at(-1)?.createdAt,
  }
}
