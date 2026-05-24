import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getShowTelaEnvStatus, isLikelyNotionDatabaseId, resolveShowTelaDatabase } from '@/lib/showtela/env'
import { resolveSupabaseServiceRoleKey, resolveSupabaseUrl } from '@/lib/supabase/env'

export const dynamic = 'force-dynamic'

const NOTION_VERSION = '2022-06-28'

type ProbeResult = {
  label: string
  envKey: string
  dbId: string | null
  status: 'ok' | 'missing_env' | 'missing_api_key' | 'unauthorized' | 'forbidden' | 'not_found' | 'http_error' | 'parse_error' | 'network_error'
  httpStatus?: number
  rowCount: number
  propertySchema: string[] | null
  error: string | null
}

async function probeNotionDB(label: string, envKey: string, dbId: string | undefined): Promise<ProbeResult> {
  const base: ProbeResult = { label, envKey, dbId: dbId ?? null, status: 'ok', rowCount: 0, propertySchema: null, error: null }

  if (!process.env.NOTION_API_KEY) {
    return { ...base, status: 'missing_api_key', error: 'NOTION_API_KEY is not set' }
  }
  if (!dbId) {
    return { ...base, status: 'missing_env', error: `${envKey} is not set` }
  }
  if (!isLikelyNotionDatabaseId(dbId)) {
    return { ...base, status: 'http_error', error: `${envKey} is not a valid Notion database id` }
  }

  let res: Response
  try {
    res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ page_size: 10 }),
      cache: 'no-store',
    })
  } catch (err) {
    return { ...base, status: 'network_error', error: String(err) }
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '(unreadable)')
    const statusMap: Record<number, ProbeResult['status']> = {
      401: 'unauthorized',
      403: 'forbidden',
      404: 'not_found',
    }
    return {
      ...base,
      status: statusMap[res.status] ?? 'http_error',
      httpStatus: res.status,
      error: body.slice(0, 500),
    }
  }

  let data: { results?: Array<{ properties?: Record<string, { type?: string }> }> }
  try {
    data = await res.json()
  } catch (err) {
    return { ...base, httpStatus: res.status, status: 'parse_error', error: String(err) }
  }

  const results = data.results ?? []
  const propertySchema = results[0]?.properties
    ? Object.entries(results[0].properties).map(([k, v]) => `${k} (${v?.type ?? '?'})`)
    : null

  return { ...base, httpStatus: res.status, status: 'ok', rowCount: results.length, propertySchema }
}

export async function GET() {
  const e = process.env
  const supabaseUrl = resolveSupabaseUrl()
  const supabaseServiceRoleKey = resolveSupabaseServiceRoleKey()
  const showTelaEnv = getShowTelaEnvStatus()

  // Env inventory
  const envInventory = {
    NOTION_API_KEY: !!e.NOTION_API_KEY,
    NOTION_API_KEY_PREFIX: e.NOTION_API_KEY ? `${e.NOTION_API_KEY.slice(0, 10)}…` : null,
    SUPABASE_URL: !!supabaseUrl.value,
    SUPABASE_URL_KEY: supabaseUrl.value ? supabaseUrl.key : null,
    SUPABASE_SERVICE_ROLE_KEY: !!supabaseServiceRoleKey.value,
    SUPABASE_SERVICE_ROLE_KEY_NAME: supabaseServiceRoleKey.value ? supabaseServiceRoleKey.key : null,
    databases: {
      people: resolveShowTelaDatabase('people'),
      operations: resolveShowTelaDatabase('operations'),
      events: resolveShowTelaDatabase('continuity'),
      unresolved: resolveShowTelaDatabase('unresolved'),
      artifacts: resolveShowTelaDatabase('artifacts'),
    },
  }

  // Probe each Notion DB
  const [people, operations, events, unresolved, artifacts] = await Promise.all([
    probeNotionDB('People', envInventory.databases.people.key, envInventory.databases.people.value),
    probeNotionDB('Operations', envInventory.databases.operations.key, envInventory.databases.operations.value),
    probeNotionDB('Events', envInventory.databases.events.key, envInventory.databases.events.value),
    probeNotionDB('Unresolved', envInventory.databases.unresolved.key, envInventory.databases.unresolved.value),
    probeNotionDB('Artifacts', envInventory.databases.artifacts.key, envInventory.databases.artifacts.value),
  ])

  const probes = { people, operations, events, unresolved, artifacts }

  // Live data determination
  const allEmpty = [people, operations, events, unresolved].every(p => p.rowCount === 0)
  const anyPermissionFailure = [people, operations, events, unresolved].some(p =>
    p.status === 'unauthorized' || p.status === 'forbidden'
  )
  const anyMissing = [people, operations, events, unresolved].some(p =>
    p.status === 'missing_env' || p.status === 'missing_api_key'
  )
  const hasLiveData = !allEmpty

  // Supabase connectivity — probe each table and known RPC/endpoint
  type SupabaseProbeResult = { status: 'ok' | 'missing_env' | 'error' | 'not_found'; rowCount?: number; error: string | null; path: string }

  async function probeSupabaseTable(table: string): Promise<SupabaseProbeResult> {
    const path = `durable table: ${table}`
    if (!supabaseUrl.value || !supabaseServiceRoleKey.value) return { status: 'missing_env', error: 'Missing Supabase env vars', path }
    try {
      const db = getSupabaseServerClient()
      const { data, error } = await db.from(table).select('id').limit(1)
      if (error) return { status: 'error', error: `${error.message} (code: ${error.code})`, path }
      return { status: 'ok', rowCount: data?.length ?? 0, error: null, path }
    } catch (err) { return { status: 'error', error: String(err), path } }
  }

  async function probeSupabaseRpc(rpcName: string): Promise<SupabaseProbeResult> {
    const path = `rpc: ${rpcName}`
    if (!supabaseUrl.value || !supabaseServiceRoleKey.value) return { status: 'missing_env', error: 'Missing env vars', path }
    const url = `${supabaseUrl.value}/rest/v1/rpc/${rpcName}`
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: supabaseServiceRoleKey.value, Authorization: `Bearer ${supabaseServiceRoleKey.value}` },
        body: JSON.stringify({ workspace_id: 'debug-probe' }),
        cache: 'no-store',
      })
      const body = await res.text().catch(() => '')
      if (res.status === 404) return { status: 'not_found', error: `RPC does not exist. Body: ${body.slice(0, 150)}`, path }
      if (!res.ok) return { status: 'error', error: `HTTP ${res.status}: ${body.slice(0, 150)}`, path }
      return { status: 'ok', error: null, path }
    } catch (err) { return { status: 'error', error: String(err), path } }
  }

  async function probeSupabaseRestTable(tableName: string): Promise<SupabaseProbeResult> {
    const path = `rest table: ${tableName}`
    if (!supabaseUrl.value || !supabaseServiceRoleKey.value) return { status: 'missing_env', error: 'Missing env vars', path }
    const url = `${supabaseUrl.value}/rest/v1/${tableName}?limit=1`
    try {
      const res = await fetch(url, {
        headers: { apikey: supabaseServiceRoleKey.value, Authorization: `Bearer ${supabaseServiceRoleKey.value}` },
        cache: 'no-store',
      })
      const body = await res.text().catch(() => '')
      if (res.status === 404) return { status: 'not_found', error: `Table does not exist. Body: ${body.slice(0, 150)}`, path }
      if (!res.ok) return { status: 'error', error: `HTTP ${res.status}: ${body.slice(0, 150)}`, path }
      return { status: 'ok', error: null, path }
    } catch (err) { return { status: 'error', error: String(err), path } }
  }

  const [
    sbArtifacts,
    sbEntities,
    sbSnapshots,
    sbIngestionJobs,
    sbRpcHydrate,
    sbRpcVector,
    sbRestOperationalMemory,
  ] = await Promise.all([
    probeSupabaseTable('durable_artifacts'),
    probeSupabaseTable('durable_entities'),
    probeSupabaseTable('durable_snapshots'),
    probeSupabaseTable('durable_ingestion_jobs'),
    probeSupabaseRpc('hydrate_workspace_continuity'),
    probeSupabaseRpc('match_operational_memory'),
    probeSupabaseRestTable('operational_memory'),
  ])

  const supabaseStatus = (!supabaseUrl.value || !supabaseServiceRoleKey.value) ? 'missing_env'
    : [sbArtifacts, sbEntities, sbSnapshots, sbIngestionJobs].every(p => p.status === 'ok') ? 'connected'
    : 'error'
  const supabaseError = [sbArtifacts, sbEntities, sbSnapshots, sbIngestionJobs]
    .filter(p => p.status === 'error').map(p => `${p.path}: ${p.error}`).join('; ') || null

  // Diagnosis
  const issues: string[] = []
  if (!e.NOTION_API_KEY) issues.push('NOTION_API_KEY is not set')
  if (anyPermissionFailure) issues.push('One or more Notion databases returned 401/403 — check integration permissions')
  if (anyMissing && e.NOTION_API_KEY) issues.push('One or more database ID env vars are missing')
  if (showTelaEnv.invalidDatabaseIds.length) issues.push(`Invalid Notion database ID format: ${showTelaEnv.invalidDatabaseIds.join(', ')}`)
  if (allEmpty && e.NOTION_API_KEY && !anyPermissionFailure && !anyMissing) issues.push('All databases returned 0 rows — databases may be empty or IDs are wrong')
  if (supabaseStatus !== 'connected') issues.push(`Supabase: ${supabaseStatus}${supabaseError ? ` — ${supabaseError}` : ''}`)

  return NextResponse.json({
    hasLiveData,
    ingestionStatus: hasLiveData ? 'ok' : 'empty',
    issues,
    envInventory,
    showTelaEnv,
    notion: { probes },
    supabase: {
      status: supabaseStatus,
      error: supabaseError,
      tables: { durable_artifacts: sbArtifacts, durable_entities: sbEntities, durable_snapshots: sbSnapshots, durable_ingestion_jobs: sbIngestionJobs },
      rpc: { hydrate_workspace_continuity: sbRpcHydrate, match_operational_memory: sbRpcVector },
      rest: { operational_memory: sbRestOperationalMemory },
    },
  }, { headers: { 'Cache-Control': 'no-store' } })
}
