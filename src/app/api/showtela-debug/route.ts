import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

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

function resolveEnv(keys: string[]): { key: string; value: string | undefined } {
  for (const key of keys) {
    if (process.env[key]) return { key, value: process.env[key] }
  }
  return { key: keys[0], value: undefined }
}

export async function GET() {
  const e = process.env

  // Env inventory
  const envInventory = {
    NOTION_API_KEY: !!e.NOTION_API_KEY,
    NOTION_API_KEY_PREFIX: e.NOTION_API_KEY ? `${e.NOTION_API_KEY.slice(0, 10)}…` : null,
    SUPABASE_URL: !!e.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!e.SUPABASE_SERVICE_ROLE_KEY,
    databases: {
      people: resolveEnv(['NOTION_SHOWTELA_PEOPLE_DB_ID', 'NOTION_CRUSADE_PEOPLE_DB_ID']),
      operations: resolveEnv(['NOTION_SHOWTELA_OPERATIONS_DB_ID', 'NOTION_CRUSADE_OPERATIONS_DB_ID']),
      events: resolveEnv(['NOTION_SHOWTELA_CONTINUITY_DB_ID', 'NOTION_CRUSADE_CONTINUITY_DB_ID', 'NOTION_CRUSADE_EVENTS_DB_ID', 'NOTION_SHOWTELA_EVENTS_DB_ID']),
      unresolved: resolveEnv(['NOTION_SHOWTELA_UNRESOLVED_DB_ID', 'NOTION_CRUSADE_UNRESOLVED_DB_ID']),
      artifacts: resolveEnv(['NOTION_SHOWTELA_ARTIFACTS_DB_ID', 'NOTION_CRUSADE_ARTIFACTS_DB_ID']),
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

  // isMockData determination
  const allEmpty = [people, operations, events, unresolved].every(p => p.rowCount === 0)
  const anyPermissionFailure = [people, operations, events, unresolved].some(p =>
    p.status === 'unauthorized' || p.status === 'forbidden'
  )
  const anyMissing = [people, operations, events, unresolved].some(p =>
    p.status === 'missing_env' || p.status === 'missing_api_key'
  )
  const isMockData = allEmpty

  // Supabase connectivity check
  let supabaseStatus: 'connected' | 'missing_env' | 'error' = 'missing_env'
  let supabaseError: string | null = null
  if (e.SUPABASE_URL && e.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const db = getSupabaseServerClient()
      const { error } = await db.from('durable_artifacts').select('id').limit(1)
      supabaseStatus = error ? 'error' : 'connected'
      supabaseError = error ? error.message : null
    } catch (err) {
      supabaseStatus = 'error'
      supabaseError = String(err)
    }
  }

  // Diagnosis
  const issues: string[] = []
  if (!e.NOTION_API_KEY) issues.push('NOTION_API_KEY is not set')
  if (anyPermissionFailure) issues.push('One or more Notion databases returned 401/403 — check integration permissions')
  if (anyMissing && e.NOTION_API_KEY) issues.push('One or more database ID env vars are missing')
  if (allEmpty && e.NOTION_API_KEY && !anyPermissionFailure && !anyMissing) issues.push('All databases returned 0 rows — databases may be empty or IDs are wrong')
  if (supabaseStatus !== 'connected') issues.push(`Supabase: ${supabaseStatus}${supabaseError ? ` — ${supabaseError}` : ''}`)

  return NextResponse.json({
    isMockData,
    ingestionStatus: isMockData ? 'failed' : 'ok',
    issues,
    envInventory,
    probes,
    supabase: { status: supabaseStatus, error: supabaseError },
  }, { headers: { 'Cache-Control': 'no-store' } })
}
