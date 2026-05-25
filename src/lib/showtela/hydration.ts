import { getArtifacts, getContinuityEvents, getOperations, getPeople, getUnresolved } from './notion'
import { mapArtifact, mapContinuityEvent, mapOperation, mapPerson, mapUnresolved } from './notionMappers'
import { calculatePressure } from './pressure'
import { threadContinuity } from './threadContinuity'
import type { ShowTelaHomeData } from './types'

export async function getShowTelaHome(): Promise<ShowTelaHomeData> {
  const [peopleRes, operationsRes, eventsRes, unresolvedRes, artifactsRes] =
    await Promise.all([
      getPeople(),
      getOperations(),
      getContinuityEvents(),
      getUnresolved(),
      getArtifacts(),
    ])

  console.log('[showtela] hydration summary', {
    peopleLoaded: peopleRes.rows.length,
    operationsLoaded: operationsRes.rows.length,
    continuityEventsLoaded: eventsRes.rows.length,
    unresolvedLoaded: unresolvedRes.rows.length,
    artifactsLoaded: artifactsRes.rows.length,
  })

  if (
    !peopleRes.rows.length &&
    !operationsRes.rows.length &&
    !eventsRes.rows.length &&
    !unresolvedRes.rows.length
  ) {
    return {
      activeOps: [],
      fluencyPartners: [],
      operations: [],
      unresolved: [],
      continuityFeed: [],
      pressureSummary: { total: 0, high: 0, medium: 0 },
      runtimeTimeline: [],
      source: 'empty',
      dataMode: 'live' as const,
    }
  }

  const people = peopleRes.rows.map(mapPerson)
  const personById = new Map(people.map((p) => [p.id, p]))

  const unresolved = unresolvedRes.rows.map(mapUnresolved)
  const operations = operationsRes.rows.map(mapOperation)
  const artifacts = artifactsRes.rows.map(mapArtifact)

  const artifactByEvent = new Map(
    artifacts
      .filter((a) => a.eventId)
      .map((a) => [a.eventId as string, a])
  )

  const lastSeenTimestamp = process.env.SHOWTELA_LAST_SEEN_TIMESTAMP
    ? new Date(process.env.SHOWTELA_LAST_SEEN_TIMESTAMP).getTime()
    : Date.now() - 1000 * 60 * 60 * 24

  const continuityFeed = threadContinuity(
    eventsRes.rows
      .map((event) => {
        const mapped = mapContinuityEvent(event, personById)
        const artifact = artifactByEvent.get(mapped.id)

        return {
          ...mapped,
          image: mapped.image ?? artifact?.image,
          isNew:
            new Date(mapped.timestamp ?? 0).getTime() > lastSeenTimestamp,
        }
      })
      .sort(
        (a, b) =>
          new Date(b.timestamp ?? 0).getTime() -
          new Date(a.timestamp ?? 0).getTime()
      )
  )

  const high = unresolved.filter((u) => u.severity === 'high').length
  const medium = unresolved.filter((u) => u.severity === 'medium').length
  const pressure = calculatePressure(unresolved)

  const runtimeTimeline = continuityFeed.slice(0, 20).map((event, idx) => ({
    id: `timeline-${event.id}`,
    timestamp: event.timestamp ?? new Date().toISOString(),
    actor: event.owner?.name ?? 'Operations',
    summary: event.headline,
    continuityObjectId: event.threadId ?? event.id,
    pressureDelta:
      (
        event.pressure === 'high'
          ? 2
          : event.pressure === 'medium'
            ? 1
            : 0
      ) -
      (idx > 0 && continuityFeed[idx - 1]?.pressure === 'high' ? 1 : 0) as
        | -2
        | -1
        | 0
        | 1
        | 2,
  }))

  return {
    activeOps: people.filter((p) => p.active).slice(0, 12),
    fluencyPartners: people.filter((p) => p.partner).slice(0, 12),
    operations,
    unresolved,
    continuityFeed,
    pressureSummary: {
      total: Math.max(unresolved.length, pressure.score),
      high,
      medium,
    },
    runtimeTimeline,
    source: 'notion',
    dataMode: 'live' as const,
  }
}
