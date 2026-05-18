import { NextResponse } from 'next/server'
const NOTION_VERSION = '2022-06-28'
async function probe(id: string | undefined, label: string) {
  if (!id) return { label, status: 'missing_env', rows: 0, props: null, error: null }
  try {
    const res = await fetch(`https://api.notion.com/v1/databases/${id}/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.NOTION_API_KEY}`, 'Notion-Version': NOTION_VERSION, 'Content-Type': 'application/json' },
      body: JSON.stringify({ page_size: 3 }), cache: 'no-store',
    })
    if (!res.ok) return { label, status: `error_${res.status}`, rows: 0, props: null, error: await res.text() }
    const data = await res.json() as { results?: Array<{ properties?: Record<string, unknown> }> }
    const results = data.results ?? []
    const props = results[0]?.properties ? Object.entries(results[0].properties).map(([k, v]) => ({ k, type: (v as Record<string,unknown>)?.type })) : null
    return { label, status: 'ok', rows: results.length, props, error: null }
  } catch(e) { return { label, status: 'fetch_error', rows: 0, props: null, error: String(e) } }
}
export async function GET() {
  const e = process.env
  const probes = await Promise.all([
    probe(e.NOTION_SHOWTELA_PEOPLE_DB_ID ?? e.NOTION_CRUSADE_PEOPLE_DB_ID, 'People'),
    probe(e.NOTION_SHOWTELA_OPERATIONS_DB_ID ?? e.NOTION_CRUSADE_OPERATIONS_DB_ID, 'Operations'),
    probe(e.NOTION_SHOWTELA_CONTINUITY_DB_ID ?? e.NOTION_CRUSADE_CONTINUITY_DB_ID ?? e.NOTION_CRUSADE_EVENTS_DB_ID, 'Events'),
    probe(e.NOTION_SHOWTELA_UNRESOLVED_DB_ID ?? e.NOTION_CRUSADE_UNRESOLVED_DB_ID, 'Unresolved'),
    probe(e.NOTION_SHOWTELA_ARTIFACTS_DB_ID ?? e.NOTION_CRUSADE_ARTIFACTS_DB_ID, 'Artifacts'),
  ])
  const envKeys = Object.keys(e).filter(k => k.includes('NOTION'))
  return NextResponse.json({ apiKey: !!e.NOTION_API_KEY, envKeys, probes }, { headers: { 'Cache-Control': 'no-store' } })
}
