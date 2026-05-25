import { Client } from '@notionhq/client'
import { SHOWTELA_DATABASES, isLikelyNotionDatabaseId, resolveShowTelaDatabase } from './env'

const notion = process.env.NOTION_API_KEY ? new Client({ auth: process.env.NOTION_API_KEY }) : null

type NotionResult = { id: string; properties?: Record<string, Record<string, unknown>>; last_edited_time?: string }
export type ShowTelaNotionProbe = {
  key: string
  label: string
  envKey: string
  configured: boolean
  validId: boolean
  status: 'ok' | 'missing_api_key' | 'missing_env' | 'malformed_db_id' | 'unauthorized' | 'forbidden' | 'not_found' | 'http_error' | 'network_error' | 'parse_error'
  rowCount: number
  error?: string
}

async function queryDatabase(databaseId: string | undefined, label?: string): Promise<NotionResult[]> {
  const tag = label ? `[notion:${label}]` : '[notion]'

  if (!process.env.NOTION_API_KEY) {
    console.error(`${tag} NOTION_API_KEY is not set`)
    return []
  }

  if (!databaseId) {
    console.error(`${tag} database ID is undefined — check env var`)
    return []
  }

  if (!isLikelyNotionDatabaseId(databaseId)) {
    console.error(`${tag} invalid Notion database ID format`)
    return []
  }

  if (!notion) {
    console.error(`${tag} Notion client failed to initialize`)
    return []
  }

  const idPreview = `${databaseId.slice(0, 8)}…`
  console.log(`${tag} querying DB ${idPreview}`)

  let response: Response
  try {
    response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ page_size: 50 }),
      cache: 'no-store',
    })
  } catch (err) {
    console.error(`${tag} fetch threw (network/DNS):`, String(err))
    return []
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '(unreadable)')
    if (response.status === 401) {
      console.error(`${tag} 401 Unauthorized — NOTION_API_KEY is invalid or expired. DB: ${idPreview}`)
    } else if (response.status === 403) {
      console.error(`${tag} 403 Forbidden — integration not connected to this database. DB: ${idPreview}`)
    } else if (response.status === 404) {
      console.error(`${tag} 404 Not Found — database ID does not exist or is not shared with integration. DB: ${idPreview}`)
    } else {
      console.error(`${tag} HTTP ${response.status} for DB ${idPreview}:`, body.slice(0, 300))
    }
    return []
  }

  let data: { results?: NotionResult[] }
  try {
    data = await response.json() as { results?: NotionResult[] }
  } catch (err) {
    console.error(`${tag} failed to parse response JSON:`, String(err))
    return []
  }

  const results = data.results ?? []
  console.log(`${tag} DB ${idPreview} returned ${results.length} rows`)

  if (results.length > 0) {
    const props = Object.keys(results[0].properties ?? {})
    console.log(`${tag} DB ${idPreview} property schema:`, props)
  } else {
    console.warn(`${tag} DB ${idPreview} returned 0 rows — database may be empty or filter too restrictive`)
  }

  return results
}

export async function getPeople() {
  return queryDatabase(resolveShowTelaDatabase('people').value, 'people')
}

export async function getOperations() {
  return queryDatabase(resolveShowTelaDatabase('operations').value, 'operations')
}

export async function getContinuityEvents() {
  return queryDatabase(resolveShowTelaDatabase('continuity').value, 'events')
}

export async function getUnresolved() {
  return queryDatabase(resolveShowTelaDatabase('unresolved').value, 'unresolved')
}

export async function getArtifacts() {
  return queryDatabase(resolveShowTelaDatabase('artifacts').value, 'artifacts')
}

export async function probeShowTelaNotionDatabases(): Promise<ShowTelaNotionProbe[]> {
  return Promise.all(
    (['people', 'operations', 'continuity', 'unresolved'] as const).map(async (key) => {
      const definition = SHOWTELA_DATABASES[key]
      const resolved = resolveShowTelaDatabase(key)
      const base = {
        key,
        label: definition.label,
        envKey: resolved.key,
        configured: Boolean(resolved.value),
        validId: Boolean(resolved.value) && isLikelyNotionDatabaseId(resolved.value),
        rowCount: 0,
      }

      if (!process.env.NOTION_API_KEY) return { ...base, status: 'missing_api_key' as const, error: 'NOTION_API_KEY is not set' }
      if (!resolved.value) return { ...base, status: 'missing_env' as const, error: `${resolved.key} is not set` }
      if (!isLikelyNotionDatabaseId(resolved.value)) return { ...base, status: 'malformed_db_id' as const, error: `${resolved.key} is not a Notion database ID` }

      try {
        const res = await fetch(`https://api.notion.com/v1/databases/${resolved.value}/query`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ page_size: 1 }),
          cache: 'no-store',
        })

        if (!res.ok) {
          const body = await res.text().catch(() => '')
          const status = res.status === 401 ? 'unauthorized'
            : res.status === 403 ? 'forbidden'
            : res.status === 404 ? 'not_found'
            : 'http_error'
          return { ...base, status, error: body.slice(0, 300) } as ShowTelaNotionProbe
        }

        const data = await res.json() as { results?: unknown[] }
        return { ...base, status: 'ok' as const, rowCount: data.results?.length ?? 0 }
      } catch (err) {
        return { ...base, status: 'network_error' as const, error: String(err) }
      }
    })
  )
}
