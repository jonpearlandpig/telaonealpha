import { NextResponse } from 'next/server'
import {
  extractInboxRichText,
  extractInboxSelect,
  extractInboxTitle,
  ingestCanonicalContinuity,
  resolveInboxDatabaseId,
} from '@/lib/continuity/ingest-runtime'

export const dynamic = 'force-dynamic'

const NOTION_VERSION = '2022-06-28'

function notionHeaders() {
  return {
    Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
  }
}

export async function POST() {
  if (!process.env.NOTION_API_KEY) {
    return NextResponse.json({ error: 'NOTION_API_KEY not set' }, { status: 500 })
  }

  const inboxDb = resolveInboxDatabaseId()

  if (!inboxDb) {
    return NextResponse.json({ error: 'Missing inbox database id' }, { status: 500 })
  }

  const inboxResponse = await fetch(`https://api.notion.com/v1/databases/${inboxDb}/query`, {
    method: 'POST',
    headers: notionHeaders(),
    body: JSON.stringify({
      page_size: 1,
      sorts: [{ timestamp: 'created_time', direction: 'descending' }],
      filter: {
        or: [
          { property: 'Status', select: { equals: 'Inbox' } },
          { property: 'Status', select: { is_empty: true } },
        ],
      },
    }),
    cache: 'no-store',
  })

  if (!inboxResponse.ok) {
    const detail = await inboxResponse.text().catch(() => '')
    return NextResponse.json({ error: 'Failed to fetch inbox', detail: detail.slice(0, 300) }, { status: 500 })
  }

  const inboxData = (await inboxResponse.json()) as {
    results?: Array<{ id: string; properties?: Record<string, unknown> }>
  }
  const newest = inboxData.results?.[0]

  if (!newest) {
    return NextResponse.json({ error: 'Inbox is empty' }, { status: 404 })
  }

  const properties = newest.properties ?? {}
  const title = extractInboxTitle(properties['Title']) || extractInboxTitle(properties['Raw Content']) || extractInboxRichText(properties['Name'])
  const body =
    extractInboxRichText(properties['Transcript']) ||
    extractInboxTitle(properties['Raw Content']) ||
    extractInboxRichText(properties['Notes']) ||
    title

  if (!title?.trim()) {
    return NextResponse.json(
      { error: 'Invalid inbox record: missing title' },
      { status: 422 },
    )
  }

  const ingested = await ingestCanonicalContinuity({
    mode: extractInboxSelect(properties['Source'])?.toLowerCase() === 'voice' ? 'voice-note' : 'quick-update',
    headline: title,
    body,
    owner: extractInboxRichText(properties['Submitted By']) || 'Operations',
    linkedEntity: extractInboxRichText(properties['Tagged Person']) || undefined,
    tags: [
      extractInboxSelect(properties['Source']),
      extractInboxSelect(properties['Type']),
      extractInboxSelect(properties['Severity']),
    ].filter(Boolean),
  })

  try {
    await fetch(`https://api.notion.com/v1/pages/${newest.id}`, {
      method: 'PATCH',
      headers: notionHeaders(),
      body: JSON.stringify({
        properties: {
          Status: {
            select: { name: 'Promoted' },
          },
        },
      }),
    })
  } catch {
    // non-fatal
  }

  return NextResponse.json({
    success: true,
    insertedId: ingested.insertedId,
    normalized: ingested.event,
    lineageId: ingested.lineageId,
    data: ingested.data,
  })
}
