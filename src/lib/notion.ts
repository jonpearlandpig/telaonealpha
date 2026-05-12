import { Client } from '@notionhq/client'
import { NOTION_PAGES } from './constants'

const notion = new Client({ auth: process.env.NOTION_API_KEY })

export type ConversionAct = {
  name: string
  status: 'active' | 'warm' | 'pending' | 'paused'
  oneLineStatus: string
  nextAction: string
  detail?: string
}

export type SyncPayload = {
  conversionActs: ConversionAct[]
  alsoInMotion: { name: string; note: string }[]
  thisWeek: { day: string; event: string; time?: string }[]
  waitingOn: { item: string; who: string; since?: string }[]
  lastSynced: string
  rawContext: string
}

async function getPageBlocks(pageId: string): Promise<string> {
  try {
    const response = await notion.blocks.children.list({
      block_id: pageId,
      page_size: 100,
    })

    const lines: string[] = []

    for (const block of response.results) {
      const b = block as Record<string, unknown>
      const type = b.type as string

      const richTextBlock = b[type] as { rich_text?: Array<{ plain_text: string }> } | undefined
      if (richTextBlock?.rich_text) {
        const text = richTextBlock.rich_text.map((t) => t.plain_text).join('')
        if (text.trim()) lines.push(text)
      }
    }

    return lines.join('\n')
  } catch {
    return ''
  }
}

function parseConversionActs(text: string): ConversionAct[] {
  const acts: ConversionAct[] = []
  const lines = text.split('\n').filter(Boolean)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.match(/^(Tim |Juan |John |Michael |David |Robert |James |Carlos |William |Thomas |Richard |Joseph )/i)) {
      const status = line.includes('🔥') || line.toLowerCase().includes('active')
        ? 'active'
        : line.includes('warm') || line.includes('📞')
        ? 'warm'
        : line.includes('pause') ? 'paused' : 'pending'

      acts.push({
        name: line.split(':')[0].replace(/🔥|📞|⏸️/g, '').trim(),
        status,
        oneLineStatus: lines[i + 1]?.trim() || line,
        nextAction: lines[i + 2]?.trim() || '',
      })
    }
  }

  return acts.slice(0, 5)
}

export async function fetchWikiContext(): Promise<SyncPayload> {
  const [currentTruth, layer2, waitingOnText] = await Promise.all([
    getPageBlocks(NOTION_PAGES.currentTruth),
    getPageBlocks(NOTION_PAGES.layer2),
    getPageBlocks(NOTION_PAGES.waitingOn),
  ])

  const conversionActs = parseConversionActs(currentTruth)
  const rawContext = [
    '=== CURRENT TRUTH ===',
    currentTruth,
    '=== LAYER 2 ===',
    layer2,
    '=== WAITING ON ===',
    waitingOnText,
  ].join('\n\n')

  return {
    conversionActs,
    alsoInMotion: [],
    thisWeek: [],
    waitingOn: [],
    lastSynced: new Date().toISOString(),
    rawContext,
  }
}

export async function fetchPearlBox() {
  try {
    const response = await notion.search({
      filter: { property: 'object', value: 'page' },
      sort: { direction: 'descending', timestamp: 'last_edited_time' },
      page_size: 20,
    })

    return response.results
      .filter((r) => {
        const rr = r as Record<string, unknown>
        const parent = rr.parent as Record<string, string> | undefined
        return parent?.database_id?.replace(/-/g, '') === NOTION_PAGES.pearlBoxDB.replace(/-/g, '')
      })
      .map((page) => {
        const p = page as Record<string, unknown>
        const props = p.properties as Record<string, Record<string, unknown>>

        const nameArr = props?.Name?.title as Array<{ plain_text: string }> | undefined
        const contentArr = props?.Content?.rich_text as Array<{ plain_text: string }> | undefined
        const sourceArr = props?.Source?.rich_text as Array<{ plain_text: string }> | undefined

        return {
          id: p.id as string,
          content: contentArr?.map((t) => t.plain_text).join('') ||
                   nameArr?.map((t) => t.plain_text).join('') || '',
          source: sourceArr?.map((t) => t.plain_text).join('') || 'TELA',
          createdAt: p.created_time as string,
          url: (p as Record<string, string>).url,
        }
      })
  } catch {
    return []
  }
}

export async function createPearlBoxEntry(content: string, source: string) {
  const page = await notion.pages.create({
    parent: { database_id: NOTION_PAGES.pearlBoxDB },
    properties: {
      Name: {
        title: [{ text: { content: content.slice(0, 100) } }],
      },
      Content: {
        rich_text: [{ text: { content } }],
      },
      Source: {
        rich_text: [{ text: { content: source } }],
      },
    },
  })

  return { id: page.id }
}
