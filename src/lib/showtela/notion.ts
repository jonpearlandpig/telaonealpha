import { Client } from '@notionhq/client'

const notion = process.env.NOTION_API_KEY ? new Client({ auth: process.env.NOTION_API_KEY }) : null

type NotionResult = { id: string; properties?: Record<string, Record<string, unknown>>; last_edited_time?: string }
type SourceType = 'database' | 'page' | 'unknown'
export type NotionSourceErrorCode = 'missing_token' | 'missing_source_id' | 'invalid_source_id' | 'access_denied' | 'not_found' | 'query_failed' | 'empty_source'

export type NotionSourceError = {
  code: NotionSourceErrorCode
  source: string
  sourceType: SourceType
  sourceId?: string
  detail: string
}

type SourceCandidate = { envName: string; value?: string; sourceType: SourceType }

export type SourceQueryResult = {
  source: string
  sourceType: SourceType
  envName?: string
  sourceId?: string
  rows: NotionResult[]
  error?: NotionSourceError
}

export type CstSourceStatus = {
  source: string
  envCandidates: Array<{ envName: string; detected: boolean; sourceType: SourceType }>
  resolvedEnvName?: string
  resolvedId?: string
  resolvedType?: SourceType
  tokenDetected: boolean
}

function sourceTypeForEnv(envName: string): SourceType {
  if (envName.endsWith('_DB_ID')) return 'database'
  if (envName.endsWith('_PAGE_ID')) return 'page'
  return 'unknown'
}

function sourceCandidates(keys: string[]): SourceCandidate[] {
  return keys.map((k) => ({ envName: k, value: process.env[k], sourceType: sourceTypeForEnv(k) }))
}

function resolveSource(keys: string[]): SourceCandidate | null {
  return sourceCandidates(keys).find((c) => Boolean(c.value)) ?? null
}

function classifyStatus(status: number): NotionSourceErrorCode {
  if (status === 400) return 'invalid_source_id'
  if (status === 401 || status === 403) return 'access_denied'
  if (status === 404) return 'not_found'
  return 'query_failed'
}

function looksLikeNotionId(value?: string): SourceType {
  if (!value) return 'unknown'
  return /^[a-f0-9]{32}$/i.test(value.replace(/-/g, '')) ? 'database' : 'unknown'
}

export function getCstSourceStatuses(): CstSourceStatus[] {
  const sources: Array<{ source: string; keys: string[] }> = [
    { source: 'people', keys: ['NOTION_CRUSADE_PEOPLE_DB_ID'] },
    { source: 'operations', keys: ['NOTION_CRUSADE_OPERATIONS_DB_ID'] },
    { source: 'continuity_events', keys: ['NOTION_CRUSADE_EVENTS_DB_ID', 'NOTION_CRUSADE_CONTINUITY_DB_ID'] },
    { source: 'unresolved', keys: ['NOTION_CRUSADE_UNRESOLVED_DB_ID'] },
    { source: 'artifacts', keys: ['NOTION_CRUSADE_ARTIFACTS_DB_ID'] },
  ]

  return sources.map(({ source, keys }) => {
    const candidates = sourceCandidates(keys)
    const resolved = resolveSource(keys)
    return {
      source,
      envCandidates: candidates.map((c) => ({ envName: c.envName, detected: Boolean(c.value), sourceType: c.sourceType })),
      resolvedEnvName: resolved?.envName,
      resolvedId: resolved?.value,
      resolvedType: looksLikeNotionId(resolved?.value),
      tokenDetected: Boolean(process.env.NOTION_API_KEY),
    }
  })
}

async function queryDatabase(keys: string[], source: string): Promise<SourceQueryResult> {
  const resolved = resolveSource(keys)
  console.info('[showtela/notion] source resolution', {
    source,
    tokenDetected: Boolean(process.env.NOTION_API_KEY),
    resolvedEnv: resolved?.envName ?? null,
    resolvedId: resolved?.value ?? null,
    resolvedType: resolved?.sourceType ?? null,
    candidates: sourceCandidates(keys).map((c) => ({ env: c.envName, detected: Boolean(c.value), sourceType: c.sourceType })),
  })

  if (!notion) return { source, sourceType: resolved?.sourceType ?? 'unknown', envName: resolved?.envName, sourceId: resolved?.value, rows: [], error: { code: 'missing_token', source, sourceType: resolved?.sourceType ?? 'unknown', sourceId: resolved?.value, detail: 'NOTION_API_KEY missing' } }
  if (!resolved?.value) return { source, sourceType: 'unknown', rows: [], error: { code: 'missing_source_id', source, sourceType: 'unknown', detail: `No source id env found. Checked: ${keys.join(', ')}` } }
  if (resolved.sourceType !== 'database') return { source, sourceType: resolved.sourceType, envName: resolved.envName, sourceId: resolved.value, rows: [], error: { code: 'invalid_source_id', source, sourceType: resolved.sourceType, sourceId: resolved.value, detail: `Env ${resolved.envName} resolved to ${resolved.sourceType}; query path requires database id.` } }

  const response = await fetch(`https://api.notion.com/v1/databases/${resolved.value}/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ page_size: 50 }),
    cache: 'no-store',
  })

  if (!response.ok) {
    return { source, sourceType: resolved.sourceType, envName: resolved.envName, sourceId: resolved.value, rows: [], error: { code: classifyStatus(response.status), source, sourceType: resolved.sourceType, sourceId: resolved.value, detail: `Notion query failed with status ${response.status}` } }
  }

  const data = (await response.json()) as { results?: NotionResult[] }
  const rows = data.results ?? []
  if (!rows.length) return { source, sourceType: resolved.sourceType, envName: resolved.envName, sourceId: resolved.value, rows: [], error: { code: 'empty_source', source, sourceType: resolved.sourceType, sourceId: resolved.value, detail: `Database ${resolved.value} returned 0 rows` } }
  return { source, sourceType: resolved.sourceType, envName: resolved.envName, sourceId: resolved.value, rows }
}

export async function getPeople() { return queryDatabase(['NOTION_CRUSADE_PEOPLE_DB_ID', 'NOTION_SHOWTELA_PEOPLE_DB_ID'], 'people') }
export async function getOperations() { return queryDatabase(['NOTION_CRUSADE_OPERATIONS_DB_ID', 'NOTION_SHOWTELA_OPERATIONS_DB_ID', 'NOTION_CRUSADE_OPS_PAGE_ID'], 'operations') }
export async function getContinuityEvents() { return queryDatabase(['NOTION_CRUSADE_EVENTS_DB_ID', 'NOTION_CRUSADE_CONTINUITY_DB_ID', 'NOTION_SHOWTELA_CONTINUITY_DB_ID', 'NOTION_CRUSADE_SHOWTELA_PAGE_ID'], 'continuity_events') }
export async function getUnresolved() { return queryDatabase(['NOTION_CRUSADE_UNRESOLVED_DB_ID', 'NOTION_SHOWTELA_UNRESOLVED_DB_ID', 'NOTION_CRUSADE_SHOWTELA_PAGE_ID'], 'unresolved') }
export async function getArtifacts() { return queryDatabase(['NOTION_CRUSADE_ARTIFACTS_DB_ID', 'NOTION_SHOWTELA_ARTIFACTS_DB_ID', 'NOTION_CRUSADE_SHOWTELA_PAGE_ID'], 'artifacts') }
