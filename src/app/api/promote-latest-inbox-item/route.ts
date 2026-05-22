import { NextResponse } from 'next/server'
import { normalizeContinuityEvent } from '@/lib/showtela/normalizeContinuityEvent'
import { resolveShowTelaDatabase } from '@/lib/showtela/env'

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

function notionParagraph(text: string) {
  return { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: text } }] } }
}
function notionHeading(text: string) {
  return { object: 'block', type: 'heading_3', heading_3: { rich_text: [{ text: { content: text } }] } }
}
function notionBullet(text: string) {
  return { object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [{ text: { content: text } }] } }
}
function notionDivider() {
  return { object: 'block', type: 'divider', divider: {} }
}

export async function POST() {
  if (!process.env.NOTION_API_KEY) {
    return NextResponse.json({ error: 'NOTION_API_KEY not set' }, { status: 500 })
  }

  const inbox = resolveShowTelaDatabase('inbox')
  const continuity = resolveShowTelaDatabase('continuity')
  const inboxDb = inbox.value
  const continuityDb = continuity.value
  if (!inboxDb || !continuityDb) {
    console.error('[PROMOTION] missing Notion database env vars:', { inbox: inbox.key, continuity: continuity.key })
    return NextResponse.json({ error: 'Missing Notion database env vars', required: [inbox.key, continuity.key] }, { status: 500 })
  }
  console.log('[PROMOTION] targeting continuity DB:', continuityDb.slice(0, 8) + '…')

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

  // 2. Normalize via Claude
  const normalized = await normalizeContinuityEvent(inboxItem)
  console.log('[PROMOTION_OUTPUT]', normalized)

  // 3. Build page body: action items, tags, entities, full transcript
  const children = [
    ...(normalized.summary ? [notionParagraph(normalized.summary)] : []),
    notionDivider(),
    ...(normalized.actionItems.length ? [
      notionHeading('Action Items'),
      ...normalized.actionItems.map(notionBullet),
    ] : []),
    ...(normalized.people.length || normalized.entities.length ? [
      notionHeading('Entities & People'),
      ...[...normalized.people, ...normalized.entities].map(notionBullet),
    ] : []),
    ...(normalized.tags.length ? [notionParagraph(`Tags: ${normalized.tags.join(', ')}`)]: []),
    notionDivider(),
    notionHeading('Raw Transcript'),
    notionParagraph(normalized.transcriptRaw || '(no transcript)'),
    ...(normalized.transcriptClean !== normalized.transcriptRaw ? [
      notionHeading('Clean Transcript'),
      notionParagraph(normalized.transcriptClean),
    ] : []),
  ]

  // 4. Write to Continuity DB (ShowTELA Feed)
  const insertRes = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: notionHeaders(),
    body: JSON.stringify({
      parent: { database_id: continuityDb },
      properties: {
        Name: { title: [{ text: { content: normalized.headline } }] },
        Summary: { rich_text: [{ text: { content: normalized.summary } }] },
        Priority: { select: { name: normalized.pressure } },
        Status: { select: { name: 'Active' } },
        Owner: { rich_text: [{ text: { content: inboxItem.submittedBy } }] },
        Updated: { date: { start: new Date().toISOString().split('T')[0] } },
      },
      children,
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
    normalized,
    insertedId: inserted.id,
  })
}
