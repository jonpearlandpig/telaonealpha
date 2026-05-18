import type { ContinuityEvent, ContinuityFeedEvent, RuntimeTimelineItem, UnresolvedObject } from './types'

const typeFromFeed = (event: ContinuityFeedEvent): ContinuityEvent['type'] => {
  if (event.approvalOwner) return 'approval_granted'
  if (event.blockedBy) return 'staffing_blocked'
  if ((event.tags ?? []).some((t) => t.toLowerCase().includes('venue'))) return 'venue_delayed'
  if ((event.tags ?? []).some((t) => t.toLowerCase().includes('travel'))) return 'transport_changed'
  if ((event.attachments ?? []).some((a) => a.type === 'contract')) return 'contract_uploaded'
  if (event.waitingOn || event.linkedEntities?.length) return 'relationship_updated'
  return 'continuity_note_added'
}

export function toContinuityEvents(feed: ContinuityFeedEvent[], source: ContinuityEvent['source']): ContinuityEvent[] {
  return feed.map((event, idx) => ({
    id: `evt-${event.id}-${idx}`,
    timestamp: event.timestamp ?? new Date().toISOString(),
    type: typeFromFeed(event),
    actorId: event.owner?.id ?? 'ops',
    targetObjectId: event.threadId ?? event.id,
    summary: event.headline,
    pressureDelta: (event.pressure === 'high' ? 2 : event.pressure === 'medium' ? 1 : 0),
    unresolvedImpact: event.isNew ? 1 : 0,
    linkedEntities: event.linkedEntities ?? [],
    linkedAttachments: (event.attachments ?? []).map((a) => a.id),
    source,
    metadata: {
      waitingOn: event.waitingOn ?? '',
      blockedBy: event.blockedBy ?? '',
      approvalOwner: event.approvalOwner ?? '',
    },
  }))
}

export function projectOperationalPressure(events: ContinuityEvent[]): number {
  return events.reduce((acc, event) => acc + event.pressureDelta + event.unresolvedImpact, 0)
}

export function projectRelationshipState(events: ContinuityEvent[], actorId: string) {
  const actorEvents = events.filter((event) => event.actorId === actorId)
  const latest = actorEvents[0]
  return {
    lastMovementAt: latest?.timestamp,
    waitingOn: typeof latest?.metadata?.waitingOn === 'string' ? latest.metadata.waitingOn : '',
    blockedBy: typeof latest?.metadata?.blockedBy === 'string' ? latest.metadata.blockedBy : '',
    unresolvedCount: actorEvents.filter((event) => event.unresolvedImpact > 0).length,
  }
}

export function projectTimeline(events: ContinuityEvent[]): RuntimeTimelineItem[] {
  return events
    .slice()
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .map((event) => ({
      id: `timeline-${event.id}`,
      timestamp: event.timestamp,
      actor: event.actorId,
      summary: event.summary,
      continuityObjectId: event.targetObjectId,
      pressureDelta: event.pressureDelta,
    }))
}

export function projectUnresolvedState(events: ContinuityEvent[], unresolved: UnresolvedObject[]): UnresolvedObject[] {
  const resolvedTargets = new Set(events.filter((event) => event.type === 'unresolved_resolved').map((event) => event.targetObjectId))
  return unresolved.map((item) => ({ ...item, blocking: resolvedTargets.has(item.id) ? false : item.blocking }))
}

export function projectDependencyState(events: ContinuityEvent[]) {
  const blocked = events.filter((event) => event.type === 'staffing_blocked' || event.type === 'venue_delayed')
  return {
    blockedCount: blocked.length,
    linkedEntityCount: blocked.reduce((acc, event) => acc + event.linkedEntities.length, 0),
  }
}
