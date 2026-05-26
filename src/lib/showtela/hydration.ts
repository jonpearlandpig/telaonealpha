import { getContinuityEvents, getOperations, getPeople, getUnresolved, probeShowTelaNotionDatabases } from './notion'
import { mapContinuityEvent, mapOperation, mapPerson, mapUnresolved } from './notionMappers'
import { calculatePressure } from './pressure'
import { assertShowTelaStartupEnv, getShowTelaEnvStatus, logShowTelaEnvStatus } from './env'
import { recoverCanonicalShowTelaHomeFromDurable } from './runtimeRecovery'
import { isCanonicalReplaceSnapshot } from './runtimeSnapshot'
import { threadContinuity } from './threadContinuity'
import { cleanBody, extractUnresolvedMarkers, validateAndFilter, validateContinuityEventRecord, validateOperationRecord, validatePersonRecord } from './normalizeNotionRecord'
import { getShowTelaCacheSchemaCompatibility, readShowTelaCache, readShowTelaCacheRow, writeShowTelaCache } from '@/lib/supabase/operationalCache'
import { getOperationalProjection } from '@/lib/runtime/state/stateProjectionStore'
import type { ShowTelaHomeData, ShowTelaHydrationSummary } from './types'
import { SHOWTELA_WORKSPACE_ID } from './runtimeIds'

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

async function attachOperationalProjection(data: ShowTelaHomeData): Promise<ShowTelaHomeData> {
  try {
    const operationalProjection = await getOperationalProjection(SHOWTELA_WORKSPACE_ID)
    return { ...data, operationalProjection }
  } catch (error) {
    console.error('[showtela:hydration] operational projection unavailable:', String(error))
    return data
  }
}

async function fetchFromNotion(): Promise<ShowTelaHomeData | null> {
  assertShowTelaStartupEnv('showtela:startup')
  logShowTelaEnvStatus('showtela:fetchFromNotion')

  const [peopleRaw, operationsRaw, eventsRaw, unresolvedRaw] = await Promise.all([
    getPeople(), getOperations(), getContinuityEvents(), getUnresolved(),
  ])

  const counts = {
    people: peopleRaw.length,
    ops: operationsRaw.length,
    events: eventsRaw.length,
    unresolved: unresolvedRaw.length,
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

  const lastSeenTimestamp = process.env.SHOWTELA_LAST_SEEN_TIMESTAMP
    ? new Date(process.env.SHOWTELA_LAST_SEEN_TIMESTAMP).getTime()
    : Date.now() - 1000 * 60 * 60 * 24

  const continuityFeed = threadContinuity(
    validEventsRaw
      .map(event => {
        const mapped = mapContinuityEvent(event, personById)
        const body = cleanBody(mapped.body)
        const unresolvedMarkers = extractUnresolvedMarkers(body)
        return {
          ...mapped,
          body,
          unresolvedMarkers: unresolvedMarkers.length ? unresolvedMarkers : undefined,
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

  return {
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
        artifacts: 0,
      },
      cacheSource: 'notion',
    }),
  }
}

// SSR path: canonical runtime only.
// Home never hydrates from legacy Notion fallback. If no canonical or cached runtime exists,
// ShowTELA stays blank until an ingest writes the durable snapshot.
export async function getShowTelaHome(): Promise<ShowTelaHomeData> {
  console.log('[TELA:TRACE] getShowTelaHome SSR — attempting Supabase cache read')
  // 1. Supabase cache — instant hydration
  try {
    const cacheRow = await readShowTelaCacheRow()
    const cached = await readShowTelaCache()
    const recovered = await recoverCanonicalShowTelaHomeFromDurable({
      cached,
      cachedUpdatedAt: cacheRow?.updated_at ?? null,
    })
    if (recovered) {
      console.log('SSR_CANONICAL_FOUND', {
        snapshotId: recovered.runtimeSnapshotMeta?.snapshotId ?? null,
        operations: recovered.operations.length,
        activeOps: recovered.activeOps.length,
        anchors: recovered.continuityFeed.length,
      })
      console.log('[TELA:TRACE] getShowTelaHome recovered canonical runtime snapshot from durable artifacts', {
        snapshotId: recovered.runtimeSnapshotMeta?.snapshotId ?? null,
        updatedAt: recovered.runtimeSnapshotMeta?.updatedAt ?? null,
        activeOpsCount: recovered.activeOps.length,
        operationsCount: recovered.operations.length,
      })
      try {
        await writeShowTelaCache(recovered)
      } catch (err) {
        console.error('[TELA:TRACE] recovered canonical snapshot cache repair failed:', String(err))
      }
      const recoveredResult = {
        ...recovered,
        source: 'supabase' as const,
        diagnosticState: 'persistence-connected' as const,
        hydration: hydrationSummary(recovered, { connectedToSupabase: true, cacheSource: 'supabase' }),
      }
      return attachOperationalProjection(recoveredResult)
    }
    if (cached) {
      console.log('SSR_CACHE_HIT', {
        snapshotId: cached.runtimeSnapshotMeta?.snapshotId ?? null,
        source: cached.source ?? 'supabase',
        operations: cached.operations.length,
        activeOps: cached.activeOps.length,
        anchors: cached.continuityFeed.length,
      })
      console.log('[TELA:TRACE] getShowTelaHome hydrated from Supabase cache', {
        source: cached.source ?? 'supabase',
        activeOpsCount: cached.activeOps.length,
        operationsCount: cached.operations.length,
        feedCount: cached.continuityFeed.length,
      })
      const cachedResult = {
        ...cached,
        source: 'supabase' as const,
        diagnosticState: 'persistence-connected' as const,
        hydration: hydrationSummary(cached, { connectedToSupabase: true, cacheSource: 'supabase' }),
      }
      return attachOperationalProjection(cachedResult)
    }
    console.log('[TELA:TRACE] getShowTelaHome — no canonical snapshot in Supabase, serving empty operational shell')
  } catch (err) {
    console.error('[TELA:TRACE] getShowTelaHome Supabase read threw:', String(err))
  }

  console.warn('[TELA:TRACE] getShowTelaHome serving EMPTY STATE — source:empty reason:canonical-runtime-missing')
  const empty = emptyShowTelaHomeData()
  return attachOperationalProjection({ ...empty, source: 'empty', diagnosticState: 'notion-unavailable', hydration: hydrationSummary(empty, { cacheSource: 'empty' }) })
}

// API route path: home refresh is canonical-runtime only.
// It must never rehydrate legacy Notion state over the active runtime.
export async function refreshShowTelaFromNotion(): Promise<ShowTelaHomeData> {
  try {
    const cacheRow = await readShowTelaCacheRow()
    const cached = await readShowTelaCache()
    const recovered = await recoverCanonicalShowTelaHomeFromDurable({
      cached,
      cachedUpdatedAt: cacheRow?.updated_at ?? null,
    })
    const effectiveCached = recovered ?? cached
    if (recovered) {
      try {
        await writeShowTelaCache(recovered)
      } catch (err) {
        console.error('[showtela] recovered canonical snapshot cache repair failed:', String(err))
      }
    }
    if (isCanonicalReplaceSnapshot(effectiveCached)) {
      const canonicalCached = effectiveCached!
      console.log('[TELA:TRACE] refreshShowTelaFromNotion canonical stop', {
        snapshotId: canonicalCached.runtimeSnapshotMeta?.snapshotId ?? null,
        workspaceId: canonicalCached.runtimeSnapshotMeta?.workspaceId ?? null,
        updatedAt: canonicalCached.runtimeSnapshotMeta?.updatedAt ?? null,
        overwriteMode: canonicalCached.runtimeSnapshotMeta?.overwriteMode ?? null,
        haltedBefore: 'notion-fetch',
      })
      return attachOperationalProjection({
        ...canonicalCached,
        source: 'supabase',
        diagnosticState: 'persistence-connected',
        hydration: hydrationSummary(canonicalCached, { connectedToSupabase: true, cacheSource: 'supabase' }),
      })
    }
    if (effectiveCached) {
      console.log('[TELA:TRACE] refreshShowTelaFromNotion returning cached runtime without Notion refresh', {
        snapshotId: effectiveCached.runtimeSnapshotMeta?.snapshotId ?? null,
        workspaceId: effectiveCached.runtimeSnapshotMeta?.workspaceId ?? null,
        updatedAt: effectiveCached.runtimeSnapshotMeta?.updatedAt ?? null,
        overwriteMode: effectiveCached.runtimeSnapshotMeta?.overwriteMode ?? null,
        refreshOrder: ['supabase-cache-read', 'durable-canonical-recovery', 'cache-return'],
      })
      return attachOperationalProjection({
        ...effectiveCached,
        source: effectiveCached.source ?? 'supabase',
        diagnosticState: effectiveCached.diagnosticState ?? 'persistence-connected',
        hydration: hydrationSummary(effectiveCached, { connectedToSupabase: true, cacheSource: 'supabase' }),
      })
    }
  } catch (err) {
    console.error('[showtela] refresh error:', String(err))
    // Try Supabase stale read
    try {
      const cached = await readShowTelaCache()
      if (cached) {
        return attachOperationalProjection({
          ...cached,
          source: 'supabase',
          diagnosticState: 'notion-unavailable',
          hydration: hydrationSummary(cached, { connectedToSupabase: true, cacheSource: 'supabase' }),
        })
      }
    } catch {
      // both failed
    }
  }

  console.warn('[showtela] refresh: no canonical ShowTELA runtime available — serving empty state')
  const empty = emptyShowTelaHomeData()
  return attachOperationalProjection({ ...empty, source: 'empty', diagnosticState: 'notion-unavailable', hydration: hydrationSummary(empty, { cacheSource: 'empty' }) })
}

export async function forceRefreshShowTelaFromNotion(): Promise<{ data: ShowTelaHomeData; summary: ShowTelaHydrationSummary; probes: Awaited<ReturnType<typeof probeShowTelaNotionDatabases>> }> {
  const probes = await probeShowTelaNotionDatabases()
  console.log('[showtela:force-refresh] Notion probes:', probes.map(p => ({ label: p.label, envKey: p.envKey, status: p.status, rowCount: p.rowCount })))

  const data = await fetchFromNotion()
  if (!data) {
    const empty = emptyShowTelaHomeData()
    const summary = hydrationSummary(empty, { cacheSource: 'empty', connectedToNotion: false })
    console.warn('[showtela:force-refresh] no live Notion data returned')
    return { data: await attachOperationalProjection({ ...empty, source: 'empty', diagnosticState: 'notion-unavailable', hydration: summary }), summary, probes }
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
    data: await attachOperationalProjection({ ...data, source: 'notion', diagnosticState: supabaseWriteOk ? 'persistence-connected' : 'persistence-failed', hydration: summary }),
    summary,
    probes,
  }
}
