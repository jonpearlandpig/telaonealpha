import { NextResponse } from 'next/server'

const NOTION_VERSION = '2022-06-28'
const headers = () => ({
  Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
  'Notion-Version': NOTION_VERSION,
  'Content-Type': 'application/json',
})

function richText(prop: Record<string, unknown> | undefined) {
  if (!prop) return ''
  const rt = (prop as { rich_text?: Array<{ plain_text?: string }> }).rich_text
  const title = (prop as { title?: Array<{ plain_text?: string }> }).title
  return rt?.[0]?.plain_text ?? title?.[0]?.plain_text ?? ''
}

function selectName(prop: Record<string, unknown> | undefined) {
  return (prop as { select?: { name?: string } } | undefined)?.select?.name
}

function checkbox(prop: Record<string, unknown> | undefined) {
  return (prop as { checkbox?: boolean } | undefined)?.checkbox
}

function numberVal(prop: Record<string, unknown> | undefined) {
  return (prop as { number?: number } | undefined)?.number
}

function dateStart(prop: Record<string, unknown> | undefined) {
  return (prop as { date?: { start?: string } } | undefined)?.date?.start
}

type NotionPage = { id: string; properties?: Record<string, Record<string, unknown>>; last_edited_time?: string }

async function queryDB(dbId: string | undefined, filter?: Record<string, unknown>): Promise<NotionPage[]> {
  if (!dbId) return []
  const body: Record<string, unknown> = { page_size: 50 }
  if (filter) body.filter = filter
  const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
    method: 'POST', headers: headers(), body: JSON.stringify(body), cache: 'no-store',
  })
  if (!res.ok) return []
  const data = await res.json() as { results?: NotionPage[] }
  return data.results ?? []
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const name = searchParams.get('name') ?? ''

  const unresolvedDb = process.env.NOTION_CRUSADE_UNRESOLVED_DB_ID
  const eventsDb = process.env.NOTION_CRUSADE_EVENTS_DB_ID
  const peopleDb = process.env.NOTION_CRUSADE_PEOPLE_DB_ID

  const [allUnresolved, allFeed, allPeople] = await Promise.all([
    queryDB(unresolvedDb),
    queryDB(eventsDb),
    queryDB(peopleDb),
  ])

  const personRecord = allPeople.find((p) => {
    const n = richText(p.properties?.['Name'])
    return n.toLowerCase().includes(name.toLowerCase().split(' ')[0].toLowerCase())
  })

  const notes = personRecord ? richText(personRecord.properties?.['Notes']) : ''

  const unresolved = allUnresolved
    .filter((u) => {
      const owner = richText(u.properties?.['Owner'])
      return owner.toLowerCase().includes(name.toLowerCase().split(' ')[0].toLowerCase())
    })
    .map((u) => ({
      id: u.id,
      title: richText(u.properties?.['Title']),
      severity: selectName(u.properties?.['Severity']),
      blocking: checkbox(u.properties?.['Blocking']),
      operation: richText(u.properties?.['Operation']),
      aging: numberVal(u.properties?.['Aging']),
    }))

  const feed = allFeed
    .filter((e) => {
      const owner = richText(e.properties?.['Owner'])
      return owner.toLowerCase().includes(name.toLowerCase().split(' ')[0].toLowerCase())
    })
    .slice(0, 5)
    .map((e) => ({
      id: e.id,
      headline: richText(e.properties?.['Name']),
      body: richText(e.properties?.['Summary']),
      timestamp: dateStart(e.properties?.['Updated']) ?? e.last_edited_time,
    }))

  return NextResponse.json({ unresolved, feed, notes }, { headers: { 'Cache-Control': 'no-store' } })
}
