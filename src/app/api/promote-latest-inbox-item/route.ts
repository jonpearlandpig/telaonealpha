import { NextResponse } from 'next/server'
import { NOTION_PAGES } from '@/lib/constants'
import { normalizeContinuityIngestionWithLLM } from '@/lib/continuity/normalize-ingestion'

export const dynamic = 'force-dynamic'

const NOTION_VERSION = '2022-06-28'

function notionHeaders() {
  return {
    Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
  }
}

function resolveContinuityDatabaseId() {
  return (
    process.env.NOTION_SHOWTELA_CONTINUITY_DB_ID ??
    process.env.NOTION_CRUSADE_CONTINUITY_DB_ID ??
    process.env.NOTION_CRUSADE_EVENTS_DB_ID
  )
}

function titleText(property: unknown) {
  return ((property as { title?: Array<{ plain_text?: string }> } | undefined)?.title ?? [])
    .map((item) => item.plain_text ?? '')
    .join('')
}

function richText(property: unknown) {
  return ((property as { rich_text?: Array<{ plain_text?: string }> } | undefined)?.rich_text ?? [])
    .map((item) => item.plain_text ?? '')
    .join('')
}

function selectValue(property: unknown) {
  return (property as { select?: { name?: string } } | undefined)?.select?.name ?? ''
}

export async function POST() {
  if (!process.env.NOTION_API_KEY) {
    return NextResponse.json({ error: 'NOTION_API_KEY not set' }, { status: 500 })
  }

  const inboxDb = process.env.NOTION_CRUSADE_INBOX_DB_ID ?? NOTION_PAGES.pearlBoxDB
  const continuityDb = resolveContinuityDatabaseId()

  if (!inboxDb || !continuityDb) {
    return NextResponse.json({ error: 'Missing inbox or continuity database id' }, { status: 500 })
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
  const title = titleText(properties['Title']) || titleText(properties['Raw Content']) || richText(properties['Name'])
  const body =
    richText(properties['Transcript']) ||
    titleText(properties['Raw Content']) ||
    richText(properties['Notes']) ||
    title

  if (!title?.trim()) {
    return NextResponse.json(
      { error: 'Invalid inbox record: missing title' },
      { status: 422 },
    )
  }

  const normalized = await normalizeContinuityIngestionWithLLM({
    mode: selectValue(properties['Source'])?.toLowerCase() === 'voice' ? 'voice-note' : 'quick-update',
    headline: title,
    body,
    owner: richText(properties['Submitted By']) || 'Operations',
    linkedEntity: richText(properties['Tagged Person']) || undefined,
    tags: [selectValue(properties['Source']), selectValue(properties['Type']), selectValue(properties['Severity'])].filter(Boolean),
  })

  const insertResponse = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: notionHeaders(),
    body: JSON.stringify({
      parent: { database_id: continuityDb },
      properties: {
        Name: { title: [{ text: { content: normalized.headline.slice(0, 200) } }] },
        Summary: { rich_text: [{ text: { content: (normalized.summary ?? normalized.body ?? '').slice(0, 2000) } }] },
        Body: { rich_text: [{ text: { content: (normalized.body ?? '').slice(0, 2000) } }] },
        'Raw Transcript': normalized.rawTranscript
          ? { rich_text: [{ text: { content: normalized.rawTranscript.slice(0, 2000) } }] }
          : undefined,
        Pressure: normalized.pressure ? { select: { name: normalized.pressure } } : undefined,
        Classification: normalized.classification ? { rich_text: [{ text: { content: normalized.classification } }] } : undefined,
        'Normalization Version': normalized.normalizationVersion
          ? { rich_text: [{ text: { content: normalized.normalizationVersion } }] }
          : undefined,
        'Normalized By': normalized.normalizedBy
          ? { rich_text: [{ text: { content: normalized.normalizedBy } }] }
          : undefined,
        'Source Mode': normalized.sourceMode
          ? { rich_text: [{ text: { content: normalized.sourceMode } }] }
          : undefined,
      },
    }),
    cache: 'no-store',
  })

  if (!insertResponse.ok) {
    const detail = await insertResponse.text().catch(() => '')
    return NextResponse.json({ error: 'Failed to insert continuity item', detail: detail.slice(0, 300) }, { status: 500 })
  }

  const inserted = (await insertResponse.json()) as { id?: string }

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
    insertedId: inserted.id,
    normalized,
  })
}
