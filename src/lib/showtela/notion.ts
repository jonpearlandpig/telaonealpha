import { Client } from '@notionhq/client'

const notion = process.env.NOTION_API_KEY ? new Client({ auth: process.env.NOTION_API_KEY }) : null

type NotionResult = { id: string; properties?: Record<string, Record<string, unknown>>; last_edited_time?: string }

function envId(keys: string[]) {
  return keys.map((k) => process.env[k]).find(Boolean)
}

async function queryDatabase(databaseId: string | undefined): Promise<NotionResult[]> {
  if (!notion || !databaseId) return []
  const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ page_size: 50 }),
    cache: 'no-store',
  })
  if (!response.ok) return []
  const data = (await response.json()) as { results?: NotionResult[] }
  return data.results ?? []
}

export async function getPeople() {
  return queryDatabase(envId(['NOTION_SHOWTELA_PEOPLE_DB_ID', 'NOTION_CRUSADE_PEOPLE_DB_ID']))
}

export async function getOperations() {
  return queryDatabase(envId(['NOTION_SHOWTELA_OPERATIONS_DB_ID', 'NOTION_CRUSADE_OPERATIONS_DB_ID']))
}

export async function getContinuityEvents() {
  return queryDatabase(envId(['NOTION_SHOWTELA_CONTINUITY_DB_ID', 'NOTION_CRUSADE_CONTINUITY_DB_ID']))
}

export async function getUnresolved() {
  return queryDatabase(envId(['NOTION_SHOWTELA_UNRESOLVED_DB_ID', 'NOTION_CRUSADE_UNRESOLVED_DB_ID']))
}

export async function getArtifacts() {
  return queryDatabase(envId(['NOTION_SHOWTELA_ARTIFACTS_DB_ID', 'NOTION_CRUSADE_ARTIFACTS_DB_ID']))
}
