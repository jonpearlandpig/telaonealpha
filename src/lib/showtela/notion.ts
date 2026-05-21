import { Client } from '@notionhq/client'

const notion = process.env.NOTION_API_KEY ? new Client({ auth: process.env.NOTION_API_KEY }) : null

type NotionResult = { id: string; properties?: Record<string, Record<string, unknown>>; last_edited_time?: string }

function envId(keys: string[]) {
  return keys.map((k) => process.env[k]).find(Boolean)
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
  return queryDatabase(envId([
    'NOTION_SHOWTELA_PEOPLE_DB_ID',
    'NOTION_CRUSADE_PEOPLE_DB_ID',
  ]), 'people')
}

export async function getOperations() {
  return queryDatabase(envId([
    'NOTION_SHOWTELA_OPERATIONS_DB_ID',
    'NOTION_CRUSADE_OPERATIONS_DB_ID',
  ]), 'operations')
}

export async function getContinuityEvents() {
  return queryDatabase(envId([
    'NOTION_SHOWTELA_CONTINUITY_DB_ID',
    'NOTION_CRUSADE_CONTINUITY_DB_ID',
    'NOTION_CRUSADE_EVENTS_DB_ID',
    'NOTION_SHOWTELA_EVENTS_DB_ID',
  ]), 'events')
}

export async function getUnresolved() {
  return queryDatabase(envId([
    'NOTION_SHOWTELA_UNRESOLVED_DB_ID',
    'NOTION_CRUSADE_UNRESOLVED_DB_ID',
  ]), 'unresolved')
}

export async function getArtifacts() {
  return queryDatabase(envId([
    'NOTION_SHOWTELA_ARTIFACTS_DB_ID',
    'NOTION_CRUSADE_ARTIFACTS_DB_ID',
  ]), 'artifacts')
}
