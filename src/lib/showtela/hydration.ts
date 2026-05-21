import { getArtifacts, getContinuityEvents, getOperations, getPeople, getUnresolved } from './notion'
import { mockShowTelaHomeData } from './mockData'
import { mapArtifact, mapContinuityEvent, mapOperation, mapPerson, mapUnresolved } from './notionMappers'
import { calculatePressure } from './pressure'
import { threadContinuity } from './threadContinuity'
import { readShowTelaCache, writeShowTelaCache } from '@/lib/supabase/operationalCache'
import type { ShowTelaHomeData } from './types'

const DEFAULT_OPERATIONS = ['Travel', 'Logistics', 'Venues', 'Hospitality', 'Security']

async function fetchFromNotion(): Promise<ShowTelaHomeData | null> {
  const [peopleRaw, operationsRaw, eventsRaw, unresolvedRaw, artifactsRaw] = await Promise.all([
    getPeople(), getOperations(), getContinuityEvents(), getUnresolved(), getArtifacts(),
  ])

  console.log('[showtela] notion fetch:', {
    people: peopleRaw.length,
    ops: operationsRaw.length,
    events: eventsRaw.length,
    unresolved: unresolvedRaw.length,
    artifacts: artifactsRaw.length,
  })

  if (!peopleRaw.length && !operationsRaw.length && !eventsRaw.length && !unresolvedRaw.length) {
    console.warn('[showtela] Notion returned empty — check NOTION_*_DB_ID env vars')
    return null
  }

  const people = peopleRaw.map(mapPerson)
  const personById = new Map(people.map(p => [p.id, p]))
  const unresolved = unresolvedRaw.map(mapUnresolved)
  const operations = operationsRaw.map(mapOperation)
  const artifacts = artifactsRaw.map(mapArtifact)
  const artifactByEvent = new Map(artifacts.filter(a => a.eventId).map(a => [a.eventId as string, a]))

  const lastSeenTimestamp = process.env.SHOWTELA_LAST_SEEN_TIMESTAMP
    ? new Date(process.env.SHOWTELA_LAST_SEEN_TIMESTAMP).getTime()
    : Date.now() - 1000 * 60 * 60 * 24

  const continuityFeed = threadContinuity(
    eventsRaw
      .map(event => {
        const mapped = mapContinuityEvent(event, personById)
        const artifact = artifactByEvent.get(mapped.id)
        return { ...mapped, image: mapped.image ?? artifact?.image, isNew: new Date(mapped.timestamp ?? 0).getTime() > lastSeenTimestamp }
      })
      .sort((a, b) => new Date(b.timestamp ?? 0).getTime() - new Date(a.timestamp ?? 0).getTime())
  )

  const operationsFilled = [...operations]
  for (const title of DEFAULT_OPERATIONS) {
    if (!operationsFilled.find(o => o.title.toLowerCase() === title.toLowerCase())) {
      operationsFilled.push({ id: title.toLowerCase(), title, status: 'Unknown', unresolvedCount: 0, latestMovement: 'No movement logged' })
    }
  }

  const high = unresolved.filter(u => u.severity === 'high').length
  const medium = unresolved.filter(u => u.severity === 'medium').length
  const pressure = calculatePressure(unresolved)

  const runtimeTimeline = continuityFeed.slice(0, 20).map((event, idx) => ({
    id: `timeline-${event.id}`,
    timestamp: event.timestamp ?? new Date().toISOString(),
    actor: event.owner?.name ?? 'Operations',
    summary: event.headline,
    continuityObjectId: event.threadId ?? event.id,
    pressureDelta: (
      (event.pressure === 'high' ? 2 : event.pressure === 'medium' ? 1 : 0) -
      (idx > 0 && continuityFeed[idx - 1]?.pressure === 'high' ? 1 : 0)
    ) as -2 | -1 | 0 | 1 | 2,
  }))

  return {
    activeOps: people.filter(p => p.active).slice(0, 12),
    fluencyPartners: people.filter(p => p.partner).slice(0, 12),
    operations: operationsFilled,
    unresolved,
    continuityFeed,
    pressureSummary: { total: Math.max(unresolved.length, pressure.score), high, medium },
    runtimeTimeline,
  }
}

// SSR path: read Supabase first for instant hydration.
// Client calls /api/home-feed on mount to get fresh Notion data.
export async function getShowTelaHome(): Promise<ShowTelaHomeData> {
  // 1. Supabase cache — instant hydration
  try {
    const cached = await readShowTelaCache()
    if (cached) {
      console.log('[showtela] hydrated from Supabase cache')
      return { ...cached, source: 'supabase', diagnosticState: 'persistence-connected' }
    }
    console.log('[showtela] Supabase cache empty — falling through to Notion')
  } catch (err) {
    console.error('[showtela] Supabase read failed:', String(err))
    // not returning — fall through to Notion
  }

  // 2. Notion — first load or cold start
  try {
    const data = await fetchFromNotion()
    if (data) {
      writeShowTelaCache(data).catch(err => console.error('[showtela] cache write failed:', String(err)))
      return { ...data, source: 'notion', diagnosticState: 'persistence-connected' }
    }
  } catch (err) {
    console.error('[showtela] Notion fetch threw:', String(err))
  }

  // 3. Mock — explicit diagnostic, no silent fallback
  console.warn('[showtela] all sources failed — serving mock data. Set NOTION_*_DB_ID env vars.')
  return { ...mockShowTelaHomeData, source: 'mock', diagnosticState: 'mock-data-active' }
}

// API route path: always fetch fresh from Notion, write to Supabase.
export async function refreshShowTelaFromNotion(): Promise<ShowTelaHomeData> {
  try {
    const data = await fetchFromNotion()
    if (data) {
      await writeShowTelaCache(data)
      return { ...data, source: 'notion', diagnosticState: 'persistence-connected' }
    }
    // Notion empty — serve stale Supabase if available
    console.warn('[showtela] Notion empty on refresh — attempting Supabase fallback')
    const cached = await readShowTelaCache()
    if (cached) {
      return { ...cached, source: 'supabase', diagnosticState: 'notion-unavailable' }
    }
  } catch (err) {
    console.error('[showtela] refresh error:', String(err))
    // Try Supabase stale read
    try {
      const cached = await readShowTelaCache()
      if (cached) {
        return { ...cached, source: 'supabase', diagnosticState: 'notion-unavailable' }
      }
    } catch {
      // both failed
    }
  }

  console.warn('[showtela] refresh: all sources failed — serving mock data')
  return { ...mockShowTelaHomeData, source: 'mock', diagnosticState: 'mock-data-active' }
}
