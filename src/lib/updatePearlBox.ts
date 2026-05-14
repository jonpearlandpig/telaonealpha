import { NOTION_PAGES } from './constants'
import { buildProvenance, formatProvenanceBlock, type ProvenanceMetadata } from './provenance'

const NOTION_VERSION = '2022-06-28'

const DESTINATION_RULES: Array<{ keywords: string[]; destination: string }> = [
  { keywords: ['teladex', 'spatial', 'navigation', ' ux', 'design system', 'rolodex'], destination: 'DESIGN SYSTEMS' },
  { keywords: ['pig pen', 'operator', 'registry'], destination: 'OPERATORS' },
  { keywords: ['mose', 'routing', 'runtime'], destination: 'RUNTIME' },
  { keywords: ['flightpath', ' cos', 'governance'], destination: 'GOVERNANCE' },
  { keywords: ['tourtext', ' akb', 'product'], destination: 'PRODUCTS' },
  { keywords: ['tela one', 'infrastructure', 'sovereign', 'architecture'], destination: 'TELA ONE' },
  { keywords: ['crusade', 'one more question', 'family rock', 'tour of testimonies'], destination: 'PROJECTS' },
]

export function routeDestination(content: string): string {
  const lower = content.toLowerCase()
  for (const rule of DESTINATION_RULES) {
    if (rule.keywords.some((k) => lower.includes(k))) {
      return rule.destination
    }
  }
  return 'GENERAL'
}

export function deriveTitle(content: string): string {
  const first = content.split(/[\n.!?]/)[0].trim()
  return first.slice(0, 80) || 'Untitled Entry'
}

async function notionREST<T = Record<string, unknown>>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`https://api.notion.com/v1${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Notion ${res.status}: ${body.slice(0, 200)}`)
  }
  return res.json() as Promise<T>
}

type UpdatePearlBoxInput = {
  title: string
  content: string
  destination: string
  sourceThread: string
  authority?: string
}

type UpdatePearlBoxResult = {
  notionId: string
  destination: string
  provenanceId: string
  title: string
}

export async function updatePearlBox(input: UpdatePearlBoxInput): Promise<UpdatePearlBoxResult> {
  const provenance = buildProvenance({
    destination: input.destination,
    sourceThread: input.sourceThread,
    authority: input.authority,
  })

  const pageTitle = `[${input.destination}] ${input.title}`

  // Create the page in pearlBoxDB
  const page = await notionREST<{ id: string }>('/pages', {
    method: 'POST',
    body: JSON.stringify({
      parent: { database_id: NOTION_PAGES.pearlBoxDB },
      properties: {
        'Raw Content': {
          title: [{ text: { content: pageTitle.slice(0, 2000) } }],
        },
        Source: { select: { name: 'Chat' } },
        Status: { select: { name: 'Inbox' } },
        Captured: { date: { start: new Date().toISOString().split('T')[0] } },
      },
    }),
  })

  // Append block content to the page
  const provenanceText = formatProvenanceBlock(provenance)
  const contentChunks = chunkText(input.content.slice(0, 4000), 2000)

  const blocks: unknown[] = [
    {
      object: 'block',
      type: 'heading_2',
      heading_2: { rich_text: [{ text: { content: input.title.slice(0, 2000) } }] },
    },
    ...contentChunks.map((chunk) => ({
      object: 'block',
      type: 'paragraph',
      paragraph: { rich_text: [{ text: { content: chunk } }] },
    })),
    { object: 'block', type: 'divider', divider: {} },
    {
  object: 'block',
  type: 'callout',
  callout: {
    rich_text: [
      {
        type: 'text',
        text: {
          content: 'TELA Memory Entry'
        }
      }
    ],
    color: 'yellow_background'
  },
  icon: {
    type: 'emoji',
    emoji: '🧠'
  }
  },
  ]

  await notionREST(`/blocks/${page.id}/children`, {
    method: 'PATCH',
    body: JSON.stringify({ children: blocks }),
  })

  console.log(JSON.stringify({
    action: 'update_pearl_box',
    timestamp: provenance.timestamp,
    destination: input.destination,
    sourceThread: input.sourceThread,
    provenanceId: provenance.id,
    notionId: page.id,
    authority: provenance.authority,
    status: 'success',
  }))

  return {
    notionId: page.id,
    destination: input.destination,
    provenanceId: provenance.id,
    title: input.title,
  }
}

function chunkText(text: string, size: number): string[] {
  const chunks: string[] = []
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size))
  }
  return chunks.length ? chunks : ['']
}
