import { createProvenance } from '@/lib/ingestion/provenance'
import { NOTION_PAGES } from '@/lib/constants'
import type { ContinuityEvent } from '@/lib/showtela/types'
import {
  normalizeContinuityIngestionWithLLM,
  type ContinuityIngestionInput,
  type NormalizeContinuityIngestionOptions,
} from './normalize-ingestion'

const NOTION_VERSION = '2022-06-28'

function notionHeaders() {
  return {
    Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
  }
}

export function resolveContinuityDatabaseId() {
  return (
    process.env.NOTION_SHOWTELA_CONTINUITY_DB_ID ??
    process.env.NOTION_CRUSADE_CONTINUITY_DB_ID ??
    process.env.NOTION_CRUSADE_EVENTS_DB_ID
  )
}

function richTextProperty(content?: string) {
  return content
    ? { rich_text: [{ text: { content: content.slice(0, 2000) } }] }
    : undefined
}

function titleProperty(content: string) {
  return { title: [{ text: { content: content.slice(0, 200) } }] }
}

function notionParagraph(text: string) {
  return { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: text.slice(0, 2000) } }] } }
}

function notionHeading(text: string) {
  return { object: 'block', type: 'heading_3', heading_3: { rich_text: [{ text: { content: text.slice(0, 200) } }] } }
}

function notionBullet(text: string) {
  return { object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [{ text: { content: text.slice(0, 2000) } }] } }
}

function notionDivider() {
  return { object: 'block', type: 'divider', divider: {} }
}

export async function ingestCanonicalContinuity(
  input: ContinuityIngestionInput,
  options?: NormalizeContinuityIngestionOptions & {
    persist?: boolean
  },
): Promise<{
  event: ContinuityEvent
  insertedId?: string
  lineageId: string
}> {
  const provenance = createProvenance({
    source: `showtela:${input.mode}`,
    author: input.owner,
    timestamp: options?.timestamp,
  })

  const event = await normalizeContinuityIngestionWithLLM(input, {
    ...options,
    timestamp: provenance.timestamp,
    continuityObjectId: options?.continuityObjectId ?? provenance.lineageId,
  })

  const canonicalEvent: ContinuityEvent = {
    ...event,
    threadId: provenance.lineageId,
  }

  if (options?.persist === false) {
    return {
      event: canonicalEvent,
      lineageId: provenance.lineageId,
    }
  }

  if (!process.env.NOTION_API_KEY) {
    throw new Error('NOTION_API_KEY not set')
  }

  const continuityDb = resolveContinuityDatabaseId()
  if (!continuityDb) {
    throw new Error('Missing continuity database id')
  }

  const response = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: notionHeaders(),
    body: JSON.stringify({
      parent: { database_id: continuityDb },
      properties: {
        Name: titleProperty(canonicalEvent.headline),
        Summary: richTextProperty(canonicalEvent.summary ?? canonicalEvent.body ?? ''),
        Priority: canonicalEvent.pressure ? { select: { name: canonicalEvent.pressure } } : undefined,
        Status: { select: { name: 'Active' } },
        Owner: richTextProperty(input.owner ?? 'Operations'),
        Updated: { date: { start: provenance.timestamp.split('T')[0] } },
      },
      children: [
        ...(canonicalEvent.summary ? [notionParagraph(canonicalEvent.summary)] : []),
        notionDivider(),
        ...(canonicalEvent.classification ? [notionHeading(`Classification: ${canonicalEvent.classification}`)] : []),
        ...(canonicalEvent.tags?.length ? [notionParagraph(`Tags: ${canonicalEvent.tags.join(', ')}`)] : []),
        ...(canonicalEvent.nextActions?.length
          ? [notionHeading('Next Actions'), ...canonicalEvent.nextActions.map(notionBullet)]
          : []),
        notionHeading('Raw Transcript'),
        notionParagraph(canonicalEvent.rawTranscript ?? canonicalEvent.body ?? '(no transcript)'),
        notionHeading('Runtime Metadata'),
        notionBullet(`Lineage: ${provenance.lineageId}`),
        notionBullet(`Source mode: ${canonicalEvent.sourceMode ?? input.mode}`),
        notionBullet(`Normalized by: ${canonicalEvent.normalizedBy ?? 'base'}`),
      ],
    }),
    cache: 'no-store',
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`Failed to insert continuity item: ${detail.slice(0, 300)}`)
  }

  const inserted = (await response.json()) as { id?: string }

  return {
    event: {
      ...canonicalEvent,
      id: inserted.id ?? canonicalEvent.id,
    },
    insertedId: inserted.id,
    lineageId: provenance.lineageId,
  }
}

export function extractInboxTitle(property: unknown) {
  return ((property as { title?: Array<{ plain_text?: string }> } | undefined)?.title ?? [])
    .map((item) => item.plain_text ?? '')
    .join('')
}

export function extractInboxRichText(property: unknown) {
  return ((property as { rich_text?: Array<{ plain_text?: string }> } | undefined)?.rich_text ?? [])
    .map((item) => item.plain_text ?? '')
    .join('')
}

export function extractInboxSelect(property: unknown) {
  return (property as { select?: { name?: string } } | undefined)?.select?.name ?? ''
}

export function resolveInboxDatabaseId() {
  return process.env.NOTION_CRUSADE_INBOX_DB_ID ?? NOTION_PAGES.pearlBoxDB
}
