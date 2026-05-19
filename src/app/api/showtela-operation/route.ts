import { NextResponse } from 'next/server'

const NOTION_VERSION = '2022-06-28'
const headers = () => ({ Authorization: `Bearer ${process.env.NOTION_API_KEY}`, 'Notion-Version': NOTION_VERSION, 'Content-Type': 'application/json' })

function richText(prop: Record<string, unknown> | undefined) {
  const rt = (prop as { rich_text?: Array<{ plain_text?: string }> } | undefined)?.rich_text
  const title = (prop as { title?: Array<{ plain_text?: string }> } | undefined)?.title
  return rt?.[0]?.plain_text ?? title?.[0]?.plain_text ?? ''
}
function selectName(prop: Record<string, unknown> | undefined) { return (prop as { select?: { name?: string } } | undefined)?.select?.name ?? '' }
function checkbox(prop: Record<string, unknown> | undefined) { return (prop as { checkbox?: boolean } | undefined)?.checkbox }
function numberVal(prop: Record<string, unknown> | undefined) { return (prop as { number?: number } | undefined)?.number }

type NotionPage = { id: string; properties?: Record<string, Record<string, unknown>> }

async function queryDB(dbId: string | undefined): Promise<NotionPage[]> {
  if (!dbId) return []
  const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, { method: 'POST', headers: headers(), body: JSON.stringify({ page_size: 50 }), cache: 'no-store' })
  if (!res.ok) return []
  const data = await res.json() as { results?: NotionPage[] }
  return data.results ?? []
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const name = searchParams.get('name') ?? ''

  const [allOps, allUnresolved] = await Promise.all([
    queryDB(process.env.NOTION_CRUSADE_OPERATIONS_DB_ID),
    queryDB(process.env.NOTION_CRUSADE_UNRESOLVED_DB_ID),
  ])

  const op = allOps.find((o) => richText(o.properties?.['Name']).toLowerCase().includes(name.toLowerCase()))
  const movement = op ? richText(op.properties?.['Latest Movement']) : ''
  const status = op ? selectName(op.properties?.['Status']) : ''
  const pressure = op ? selectName(op.properties?.['Pressure']) : ''

  const unresolved = allUnresolved
    .filter((u) => richText(u.properties?.['Operation']).toLowerCase().includes(name.toLowerCase()))
    .map((u) => ({
      id: u.id,
      title: richText(u.properties?.['Title']),
      severity: selectName(u.properties?.['Severity']),
      blocking: checkbox(u.properties?.['Blocking']),
      aging: numberVal(u.properties?.['Aging']),
      owner: richText(u.properties?.['Owner']),
    }))

  return NextResponse.json({ unresolved, movement, status, pressure }, { headers: { 'Cache-Control': 'no-store' } })
}
