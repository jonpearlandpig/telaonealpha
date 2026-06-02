import type { ArtifactRecord } from '@/lib/artifacts/artifactStore'
import { parseMarkdownCalendar } from '@/lib/continuity/parseMarkdownCalendar'
import type { OperationalCalendarEvent } from './calendar'
import type { ShowTelaContinuityEventRecord } from './continuityEvents'

function continuityRank(eventType: string) {
  if (eventType === 'CALENDAR_HYDRATED') return 3
  if (eventType === 'CALENDAR_UPLOADED') return 2
  if (eventType === 'ARTIFACT_CREATED' || eventType === 'ARTIFACT_UPDATED') return 1
  return 0
}

function buildArtifactContinuityIndex(events: ShowTelaContinuityEventRecord[]) {
  const byArtifact = new Map<string, ShowTelaContinuityEventRecord>()

  for (const event of events) {
    if (!event.artifact_id) continue
    const current = byArtifact.get(event.artifact_id)
    if (!current) {
      byArtifact.set(event.artifact_id, event)
      continue
    }

    const currentRank = continuityRank(current.event_type)
    const nextRank = continuityRank(event.event_type)
    if (nextRank > currentRank || (nextRank === currentRank && event.created_at.localeCompare(current.created_at) > 0)) {
      byArtifact.set(event.artifact_id, event)
    }
  }

  return byArtifact
}

export function buildCanonicalCalendarEvents(input: {
  artifacts: ArtifactRecord[]
  continuityEvents: ShowTelaContinuityEventRecord[]
  hydratedAt: string
}): OperationalCalendarEvent[] {
  const events = new Map<string, OperationalCalendarEvent>()
  const continuityByArtifact = buildArtifactContinuityIndex(input.continuityEvents)

  for (const artifact of [...input.artifacts].sort((left, right) => left.createdAt.localeCompare(right.createdAt))) {
    const calendar = parseMarkdownCalendar(artifact.text ?? '')
    if (calendar.events.length === 0) continue

    const continuityEvent = continuityByArtifact.get(artifact.id)
    const importTimestamp = continuityEvent?.created_at ?? artifact.createdAt

    for (const event of calendar.events) {
      events.set(event.id, {
        id: event.id,
        title: event.title,
        type: 'show',
        status: 'active',
        source: 'artifact',
        timestamp: event.isoTimestamp,
        startTime: event.isoTimestamp,
        people: event.owner ? [event.owner] : [],
        departments: [event.department],
        location: event.location,
        summary: event.location ? `${event.department} / ${event.location}` : event.department,
        unresolvedCount: 0,
        pressureState: 'active',
        continuityState: 'fresh',
        density: 'light',
        telaHint: 'Imported calendar evidence now drives this surface.',
        lineagePlaceholder: continuityEvent?.event_id ?? artifact.id,
        sourceEntityId: artifact.id,
        sourceArtifactId: artifact.id,
        sourceArtifactTitle: artifact.title,
        importedAt: importTimestamp,
        freshnessTimestamp: input.hydratedAt,
        continuityEventId: continuityEvent?.event_id,
        lineage: {
          originatingArtifactId: artifact.id,
          originatingArtifactTitle: artifact.title,
          continuityEventId: continuityEvent?.event_id,
          importTimestamp,
          freshnessTimestamp: input.hydratedAt,
        },
      })
    }
  }

  return [...events.values()].sort((left, right) => left.timestamp.localeCompare(right.timestamp))
}
