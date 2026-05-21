import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const NOTION_VERSION = '2022-06-28'
const notionHeaders = () => ({
  Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
  'Notion-Version': NOTION_VERSION,
  'Content-Type': 'application/json',
})

const richText = (p: unknown) =>
  (p as { rich_text?: Array<{ plain_text?: string }> } | undefined)?.rich_text?.[0]?.plain_text ?? ''
const titleText = (p: unknown) =>
  (p as { title?: Array<{ plain_text?: string }> } | undefined)?.title?.[0]?.plain_text ?? ''
const selectVal = (p: unknown) =>
  (p as { select?: { name?: string } } | undefined)?.select?.name ?? ''

export async function POST() {
  if (!process.env.NOTION_API_KEY) {
    return NextResponse.json({ error: 'NOTION_API_KEY not set' }, { status: 500 })
  }

  const inboxDb = process.env.NOTION_TELA_INBOX_DB_ID ?? '004750ec83914561b1d20b669dd00a3f'
  const continuityDb = process.env.NOTION_SHOWTELA_CONTINUITY_DB_ID ?? '985c3dd540d64250836a385a0a4e5091'

  // 1. Fetch newest inbox row
  const inboxRes = await fetch(`https://api.notion.com/v1/databases/${inboxDb}/query`, {
    method: 'POST',
    headers: notionHeaders(),
    body: JSON.stringify({
      page_size: 1,
      sorts: [{ timestamp: 'created_time', direction: 'descending' }],
    }),
    cache: 'no-store',
  })

  if (!inboxRes.ok) {
    const body = await inboxRes.text().catch(() => '')
    console.error('[PROMOTION] inbox fetch failed:', inboxRes.status, body.slice(0, 200))
    return NextResponse.json({ error: 'Failed to fetch inbox', status: inboxRes.status }, { status: 500 })
  }

  const inboxData = await inboxRes.json() as {
    results?: Array<{ id: string; properties?: Record<string, unknown> }>
  }
  const newest = inboxData.results?.[0]
  if (!newest) {
    return NextResponse.json({ error: 'Inbox is empty' }, { status: 404 })
  }

  const p = newest.properties ?? {}
  const inboxItem = {
    id: newest.id,
    title: titleText(p['Title']),
    transcript: richText(p['Transcript']),
    severity: selectVal(p['Severity']),
    type: selectVal(p['Type']),
    source: selectVal(p['Source']),
    submittedBy: richText(p['Submitted By']),
    taggedPerson: richText(p['Tagged Person']),
    notes: richText(p['Notes']),
  }

  console.log('[PROMOTION_INPUT]', inboxItem)

  // 2. Normalize to continuity schema
  const summaryParts = [
    inboxItem.transcript,
    inboxItem.notes ? `Notes: ${inboxItem.notes}` : null,
    inboxItem.taggedPerson ? `Tagged: ${inboxItem.taggedPerson}` : null,
    inboxItem.type ? `Type: ${inboxItem.type}` : null,
    `Source: ${inboxItem.source || 'Voice'}`,
  ].filter(Boolean)

  const rawSeverity = (inboxItem.severity || 'medium').toLowerCase()
  const priority = rawSeverity === 'high' ? 'High' : rawSeverity === 'low' ? 'Low' : 'Medium'

  const continuityPayload = {
    name: inboxItem.title || 'Promoted Inbox Item',
    summary: summaryParts.join(' | '),
    priority,
    status: 'Active',
    owner: inboxItem.submittedBy,
    updated: new Date().toISOString().split('T')[0],
  }

  console.log('[PROMOTION_OUTPUT]', continuityPayload)

  // 3. Write to Continuity DB (ShowTELA Feed)
  const insertRes = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: notionHeaders(),
    body: JSON.stringify({
      parent: { database_id: continuityDb },
      properties: {
        Name: { title: [{ text: { content: continuityPayload.name } }] },
        Summary: { rich_text: [{ text: { content: continuityPayload.summary } }] },
        Priority: { select: { name: continuityPayload.priority } },
        Status: { select: { name: continuityPayload.status } },
        Owner: { rich_text: [{ text: { content: continuityPayload.owner } }] },
        Updated: { date: { start: continuityPayload.updated } },
      },
    }),
    cache: 'no-store',
  })

  if (!insertRes.ok) {
    const body = await insertRes.text().catch(() => '')
    console.error('[PROMOTION] continuity insert failed:', insertRes.status, body.slice(0, 300))
    return NextResponse.json({ error: 'Failed to insert into continuity DB', detail: body.slice(0, 300) }, { status: 500 })
  }

  const inserted = await insertRes.json() as { id?: string }
  console.log('[CONTINUITY_INSERT_SUCCESS]', inserted.id)

  return NextResponse.json({
    success: true,
    inboxItem,
    continuityPayload,
    insertedId: inserted.id,
  })
}
