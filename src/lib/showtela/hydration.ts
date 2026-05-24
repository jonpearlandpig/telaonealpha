import { getArtifacts, getContinuityEvents, getOperations, getPeople, getUnresolved, probeShowTelaNotionDatabases } from './notion'
import { mapArtifact, mapContinuityEvent, mapOperation, mapPerson, mapUnresolved } from './notionMappers'
import { calculatePressure } from './pressure'
import { assertShowTelaStartupEnv, getShowTelaEnvStatus, logShowTelaEnvStatus } from './env'
import { threadContinuity } from './threadContinuity'
import { cleanBody, extractUnresolvedMarkers, validateAndFilter, validateContinuityEventRecord, validateOperationRecord, validatePersonRecord } from './normalizeNotionRecord'
import { getShowTelaCacheSchemaCompatibility, readShowTelaCache, writeShowTelaCache } from '@/lib/supabase/operationalCache'
import { mergePersistedRuntimeContinuity } from './runtimeContinuity'
import type { ShowTelaHomeData, ShowTelaHydrationSummary } from './types'

function emptyShowTelaHomeData(): ShowTelaHomeData {
  return {
    activeOps: [],
    fluencyPartners: [],
    operations: [],
    unresolved: [],
    continuityFeed: [],
    pressureSummary: { total: 0, high: 0, medium: 0 },
    runtimeTimeline: [],
  }
}

function countsFor(data: ShowTelaHomeData) {
  return {
    people: data.activeOps.length + data.fluencyPartners.length,
    operations: data.operations.length,
    continuity: data.continuityFeed.length,
    unresolved: data.unresolved.length,
    artifacts: 0,
  }
}

function hydrationSummary(
  data: ShowTelaHomeData,
  input: Partial<ShowTelaHydrationSummary> & Pick<ShowTelaHydrationSummary, 'cacheSource'>
): ShowTelaHydrationSummary {
  const env = getShowTelaEnvStatus()
  return {
    connectedToNotion: input.connectedToNotion ?? false,
    connectedToSupabase: input.connectedToSupabase ?? false,
    counts: input.counts ?? countsFor(data),
    lastHydratedAt: input.lastHydratedAt ?? new Date().toISOString(),
    cacheSource: input.cacheSource,
    supabaseWriteOk: input.supabaseWriteOk,
    durableArtifactsCompatible: getShowTelaCacheSchemaCompatibility().compatible,
    missingRequiredEnv: env.missingRequired,
    invalidDatabaseIds: env.invalidDatabaseIds,
  }
}

async function fetchFromNotion(): Promise<ShowTelaHomeData | null> {
  assertShowTelaStartupEnv('showtela:startup')
  logShowTelaEnvStatus('showtela:fetchFromNotion')

  const [peopleRaw, operationsRaw, eventsRaw, unresolvedRaw, artifactsRaw] = await Promise.all([
    getPeople(), getOperations(), getContinuityEvents(), getUnresolved(), getArtifacts(),
  ])

  const counts = {
    people: peopleRaw.length,
    ops: operationsRaw.length,
    events: eventsRaw.length,
    unresolved: unresolvedRaw.length,
    artifacts: artifactsRaw.length,
  }
  console.log('[showtela:fetchFromNotion] row counts:', counts)
  const probes = await probeShowTelaNotionDatabases()
  console.log('[showtela:fetchFromNotion] Notion probes:', probes.map(p => ({ label: p.label, envKey: p.envKey, status: p.status, rowCount: p.rowCount })))

  if (!peopleRaw.length && !operationsRaw.length && !eventsRaw.length && !unresolvedRaw.length) {
    console.error('[showtela:fetchFromNotion] all live Notion databases returned 0 rows')
    return null
  }

  // Normalization Pass 1 — schema validation before mapper calls.
  // Invalid records are excluded and logged. Valid records with schema warnings
  // are included so a single bad property does not drop the entire record.
  const validPeopleRaw = validateAndFilter(peopleRaw, validatePersonRecord, 'people')
  const validOperationsRaw = validateAndFilter(operationsRaw, validateOperationRecord, 'operations')
  const validEventsRaw = validateAndFilter(eventsRaw, validateContinuityEventRecord, 'events')

  const people = validPeopleRaw.map(mapPerson)
  const personById = new Map(people.map(p => [p.id, p]))
  const unresolved = unresolvedRaw.map(mapUnresolved)
  const operations = validOperationsRaw.map(mapOperation)
  const artifacts = artifactsRaw.map(mapArtifact)
  const artifactByEvent = new Map(artifacts.filter(a => a.eventId).map(a => [a.eventId as string, a]))

  const lastSeenTimestamp = process.env.SHOWTELA_LAST_SEEN_TIMESTAMP
    ? new Date(process.env.SHOWTELA_LAST_SEEN_TIMESTAMP).getTime()
    : Date.now() - 1000 * 60 * 60 * 24

  const continuityFeed = threadContinuity(
    validEventsRaw
      .map(event => {
        const mapped = mapContinuityEvent(event, personById)
        const artifact = artifactByEvent.get(mapped.id)
        // Normalization Pass 1 — body cleanup and unresolved marker extraction.
        // cleanBody removes whitespace artifacts without altering operational meaning.
        // extractUnresolvedMarkers reads the cleaned body; does not modify it.
        const body = cleanBody(mapped.body)
        const unresolvedMarkers = extractUnresolvedMarkers(body)
        return {
          ...mapped,
          body,
          unresolvedMarkers: unresolvedMarkers.length ? unresolvedMarkers : undefined,
          image: mapped.image ?? artifact?.image,
          isNew: new Date(mapped.timestamp ?? 0).getTime() > lastSeenTimestamp,
        }
      })
      .sort((a, b) => new Date(b.timestamp ?? 0).getTime() - new Date(a.timestamp ?? 0).getTime())
  )

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

  return mergePersistedRuntimeContinuity({
    activeOps: people.filter(p => p.active).slice(0, 12),
    fluencyPartners: people.filter(p => p.partner).slice(0, 12),
    operations,
    unresolved,
    continuityFeed,
    pressureSummary: { total: Math.max(unresolved.length, pressure.score), high, medium },
    runtimeTimeline,
    hydration: hydrationSummary(emptyShowTelaHomeData(), {
      connectedToNotion: true,
      connectedToSupabase: false,
      counts: {
        people: peopleRaw.length,
        operations: operationsRaw.length,
        continuity: eventsRaw.length,
        unresolved: unresolvedRaw.length,
        artifacts: artifactsRaw.length,
      },
      cacheSource: 'notion',
    }),
  })
}

// SSR path: read Supabase first for instant hydration.
// Client calls /api/home-feed on mount to get fresh Notion data.
export async function getShowTelaHome(): Promise<ShowTelaHomeData> {
  console.log('[TELA:TRACE] getShowTelaHome SSR — attempting Supabase cache read')
  // 1. Supabase cache — instant hydration
  try {
    const cached = await readShowTelaCache()
    if (cached) {
      const reconstructed = await mergePersistedRuntimeContinuity(cached)
      console.log('[TELA:TRACE] getShowTelaHome hydrated from Supabase cache', {
        source: reconstructed.source ?? 'supabase',
        activeOpsCount: reconstructed.activeOps.length,
        operationsCount: reconstructed.operations.length,
        feedCount: reconstructed.continuityFeed.length,
      })
      return {
        ...reconstructed,
        source: 'supabase',
        diagnosticState: 'persistence-connected',
        hydration: hydrationSummary(reconstructed, { connectedToSupabase: true, cacheSource: 'supabase' }),
      }
    }
    console.log('[TELA:TRACE] getShowTelaHome Supabase cache miss — falling through to Notion')
  } catch (err) {
    console.error('[TELA:TRACE] getShowTelaHome Supabase read threw:', String(err))
    // not returning — fall through to Notion
  }

  // 2. Notion — first load or cold start
  try {
    const data = await fetchFromNotion()
    if (data) {
      console.log('[TELA:TRACE] getShowTelaHome Notion returned data — source:notion', {
        activeOpsCount: data.activeOps.length,
        operationsCount: data.operations.length,
        feedCount: data.continuityFeed.length,
      })
      writeShowTelaCache(data)
        .then(() => console.log('[showtela] hydration success: Notion fetched and Supabase cache write completed'))
        .catch(err => console.error('[showtela] cache write failed:', String(err)))
      return { ...data, source: 'notion', diagnosticState: 'persistence-connected' }
    }
    console.log('[TELA:TRACE] getShowTelaHome Notion returned null — falling to empty state')
  } catch (err) {
    console.error('[TELA:TRACE] getShowTelaHome Notion fetch threw:', String(err))
  }

  console.warn('[TELA:TRACE] getShowTelaHome serving EMPTY STATE — source:empty')
  const empty = emptyShowTelaHomeData()
  return { ...empty, source: 'empty', diagnosticState: 'notion-unavailable', hydration: hydrationSummary(empty, { cacheSource: 'empty' }) }
}

// API route path: always fetch fresh from Notion, write to Supabase.
export async function refreshShowTelaFromNotion(): Promise<ShowTelaHomeData> {
  try {
    const data = await fetchFromNotion()
    if (data) {
      try {
        await writeShowTelaCache(data)
        console.log('[showtela] hydration success: refreshed from Notion and wrote durable_artifacts')
        return { ...data, source: 'notion', diagnosticState: 'persistence-connected' }
      } catch (err) {
        console.error('[showtela] cache write failed after Notion refresh:', String(err))
        return {
          ...data,
          source: 'notion',
          diagnosticState: 'persistence-connected',
          hydration: hydrationSummary(data, {
            connectedToNotion: true,
            connectedToSupabase: false,
            supabaseWriteOk: false,
            cacheSource: 'notion',
          }),
        }
      }
    }
    // Notion empty — serve stale Supabase if available
    console.warn('[showtela] Notion empty on refresh — attempting Supabase fallback')
    const cached = await readShowTelaCache()
    if (cached) {
      return {
        ...cached,
        source: 'supabase',
        diagnosticState: 'notion-unavailable',
        hydration: hydrationSummary(cached, { connectedToSupabase: true, cacheSource: 'supabase' }),
      }
    }
  } catch (err) {
    console.error('[showtela] refresh error:', String(err))
    // Try Supabase stale read
    try {
      const cached = await readShowTelaCache()
      if (cached) {
        return {
          ...cached,
          source: 'supabase',
          diagnosticState: 'notion-unavailable',
          hydration: hydrationSummary(cached, { connectedToSupabase: true, cacheSource: 'supabase' }),
        }
      }
    } catch {
      // both failed
    }
  }

  console.warn('[showtela] refresh: no live ShowTELA data available — serving empty state')
  const empty = emptyShowTelaHomeData()
  return { ...empty, source: 'empty', diagnosticState: 'notion-unavailable', hydration: hydrationSummary(empty, { cacheSource: 'empty' }) }
}

export async function forceRefreshShowTelaFromNotion(): Promise<{ data: ShowTelaHomeData; summary: ShowTelaHydrationSummary; probes: Awaited<ReturnType<typeof probeShowTelaNotionDatabases>> }> {
  const probes = await probeShowTelaNotionDatabases()
  console.log('[showtela:force-refresh] Notion probes:', probes.map(p => ({ label: p.label, envKey: p.envKey, status: p.status, rowCount: p.rowCount })))

  const data = await fetchFromNotion()
  if (!data) {
    const empty = emptyShowTelaHomeData()
    const summary = hydrationSummary(empty, { cacheSource: 'empty', connectedToNotion: false })
    console.warn('[showtela:force-refresh] no live Notion data returned')
    return { data: { ...empty, source: 'empty', diagnosticState: 'notion-unavailable', hydration: summary }, summary, probes }
  }

  let supabaseWriteOk = false
  try {
    await writeShowTelaCache(data)
    supabaseWriteOk = true
    console.log('[showtela:force-refresh] hydration success: Notion fetched and durable_artifacts write completed')
  } catch (err) {
    console.error('[showtela:force-refresh] Supabase write failed:', String(err))
  }

  const summary = hydrationSummary(data, {
    cacheSource: 'notion',
    connectedToNotion: true,
    connectedToSupabase: supabaseWriteOk,
    supabaseWriteOk,
  })

  return {
    data: { ...data, source: 'notion', diagnosticState: supabaseWriteOk ? 'persistence-connected' : 'persistence-failed', hydration: summary },
    summary,
    probes,
  }
}
