import { getArtifacts, getContinuityEvents, getOperations, getPeople, getUnresolved } from './notion'
import { mockShowTelaHomeData } from './mockData'
import { mapArtifact, mapContinuityFeedEvent, mapOperation, mapPerson, mapUnresolved } from './notionMappers'
import { projectTimeline, toContinuityEvents } from './eventSourcing'
import { calculatePressure } from './pressure'
import { threadContinuity } from './threadContinuity'
import type { ShowTelaHomeData } from './types'

const DEFAULT_OPERATIONS = ['Travel', 'Logistics', 'Venues', 'Hospitality', 'Security']

export async function getShowTelaHome(): Promise<ShowTelaHomeData> {
  const [peopleRaw, operationsRaw, eventsRaw, unresolvedRaw, artifactsRaw] = await Promise.all([getPeople(), getOperations(), getContinuityEvents(), getUnresolved(), getArtifacts()])
  console.log('[showtela] hydration summary', { peopleLoaded: peopleRaw.length, operationsLoaded: operationsRaw.length, continuityEventsLoaded: eventsRaw.length, unresolvedLoaded: unresolvedRaw.length, artifactsLoaded: artifactsRaw.length })
  if (!peopleRaw.length && !operationsRaw.length && !eventsRaw.length && !unresolvedRaw.length) return mockShowTelaHomeData

  const people = peopleRaw.map(mapPerson)
  const personById = new Map(people.map((p) => [p.id, p]))
  const unresolved = unresolvedRaw.map(mapUnresolved)
  const operations = operationsRaw.map(mapOperation)
  const artifacts = artifactsRaw.map(mapArtifact)

  const artifactByEvent = new Map(artifacts.filter((a) => a.eventId).map((a) => [a.eventId as string, a]))

  const lastSeenTimestamp = process.env.SHOWTELA_LAST_SEEN_TIMESTAMP ? new Date(process.env.SHOWTELA_LAST_SEEN_TIMESTAMP).getTime() : Date.now() - 1000 * 60 * 60 * 24
  const continuityFeed = threadContinuity(eventsRaw
    .map((event) => {
      const mapped = mapContinuityFeedEvent(event, personById)
      const artifact = artifactByEvent.get(mapped.id)
      return { ...mapped, image: mapped.image ?? artifact?.image, isNew: new Date(mapped.timestamp ?? 0).getTime() > lastSeenTimestamp }
    })
    .sort((a, b) => new Date(b.timestamp ?? 0).getTime() - new Date(a.timestamp ?? 0).getTime()))

  const operationsFilled = [...operations]
  for (const title of DEFAULT_OPERATIONS) {
    if (!operationsFilled.find((o) => o.title.toLowerCase() === title.toLowerCase())) {
      operationsFilled.push({ id: title.toLowerCase(), title, status: 'Unknown', unresolvedCount: 0, latestMovement: 'No movement logged' })
    }
  }

  const high = unresolved.filter((u) => u.severity === 'high').length
  const medium = unresolved.filter((u) => u.severity === 'medium').length
  const pressure = calculatePressure(unresolved)
  const continuityEvents = toContinuityEvents(continuityFeed, 'notion')
  const runtimeTimeline = projectTimeline(continuityEvents).slice(0, 20)

  return {
    activeOps: people.filter((p) => p.active).slice(0, 12),
    fluencyPartners: people.filter((p) => p.partner).slice(0, 12),
    operations: operationsFilled,
    unresolved,
    continuityFeed,
    continuityEvents,
    pressureSummary: { total: Math.max(unresolved.length, pressure.score), high, medium },
    runtimeTimeline,
  }
}
