import { Client } from '@notionhq/client'
import { NOTION_PAGES } from './constants'

const notion = new Client({ auth: process.env.NOTION_API_KEY })
const NOTION_VERSION = '2022-06-28'

export type ConversionAct = {
  name: string
  status: 'active' | 'warm' | 'pending' | 'paused'
  oneLineStatus: string
  nextAction: string
}

export type AlsoInMotion = {
  name: string
  note: string
}

export type SyncPayload = {
  conversionActs: ConversionAct[]
  alsoInMotion: AlsoInMotion[]
  thisWeek: { day: string; event: string; time?: string }[]
  waitingOn: { item: string; who: string; since?: string }[]
  lastSynced: string
  rawContext: string
}

// Direct REST call — SDK v5 removed databases.query
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
  if (!res.ok) throw new Error(`Notion ${res.status}: ${endpoint}`)
  return res.json() as Promise<T>
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

      // Handle table rows specially
      if (type === 'table_row') {
        const row = b.table_row as { cells: Array<Array<{ plain_text: string }>> }
        const cells = row.cells.map((c) => c.map((t) => t.plain_text).join('')).join(' | ')
        if (cells.trim()) lines.push(cells)
        continue
      }

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

function detectStatus(text: string): ConversionAct['status'] {
  if (text.includes('🔥') || text.toUpperCase().includes('ACTIVE')) return 'active'
  if (text.includes('⏸️') || /\bpause\b|\bhold\b|\bdo not initiate\b/i.test(text)) return 'paused'
  if (text.includes('🟡') || /\bwarm\b/i.test(text)) return 'warm'
  return 'pending'
}

function parseConversionActs(text: string): ConversionAct[] {
  const acts: ConversionAct[] = []
  const lines = text.split('\n').filter((l) => l.trim())

  let inSection = false
  let current: Partial<ConversionAct> | null = null

  function pushCurrent() {
    if (current?.name) {
      acts.push({
        name: current.name,
        status: current.status ?? 'pending',
        oneLineStatus: current.oneLineStatus ?? '',
        nextAction: current.nextAction ?? '',
      })
    }
    current = null
  }

  for (const line of lines) {
    // Section start
    if (/TOP 5 CONVERSION ACTS|CONVERSION ACTS/i.test(line)) {
      inSection = true
      continue
    }

    // Section end
    if (inSection && /^(ALSO IN MOTION|WHAT IS REAL|OPERATING TEST|STANDING|##)/i.test(line)) {
      pushCurrent()
      inSection = false
      continue
    }

    if (!inSection) continue

    // Numbered act header: "1. Crusade: The Musical" or "**1. Crusade**"
    const actMatch = line.match(/^(?:\*{1,2})?(\d)\.\s+(.+?)(?:\*{1,2})?$/)
    if (actMatch) {
      pushCurrent()
      const name = actMatch[2].replace(/\*/g, '').trim()
      current = { name, status: 'pending', oneLineStatus: '', nextAction: '' }
      continue
    }

    if (current) {
      const clean = line.replace(/\*/g, '').trim()

      // Status detection on any line
      const lineStatus = detectStatus(line)
      if (lineStatus !== 'pending') current.status = lineStatus

      // First substantive line becomes oneLineStatus
      if (!current.oneLineStatus && clean && !/^(Gate:|Next:|Backup:)/i.test(clean)) {
        current.oneLineStatus = clean.slice(0, 120)
      }

      // Gate / Next line becomes nextAction
      if (!current.nextAction && /^(Gate:|Next:|Backup:|→)/i.test(clean)) {
        current.nextAction = clean.slice(0, 100)
      }
    }
  }
  pushCurrent()

  return acts.slice(0, 5)
}

function parseAlsoInMotion(text: string): AlsoInMotion[] {
  const contacts: AlsoInMotion[] = []
  const lines = text.split('\n').filter((l) => l.trim())
  let inSection = false

  for (const line of lines) {
    if (/ALSO IN MOTION/i.test(line)) { inSection = true; continue }
    if (inSection && /^(WHAT IS REAL|OPERATING|STANDING|##)/i.test(line)) break
    if (!inSection) continue

    // Pattern: "Name / Context — Note" or "**Name** — Note"
    const match = line.match(/^\*{0,2}([^—\n]+?)\*{0,2}\s*—\s*(.+)$/)
    if (match) {
      contacts.push({
        name: match[1].replace(/\*/g, '').trim(),
        note: match[2].trim().slice(0, 140),
      })
    }
  }

  return contacts.slice(0, 8)
}

export async function fetchWikiContext(): Promise<SyncPayload> {
  const [currentTruth, layer2, waitingOnText] = await Promise.all([
    getPageBlocks(NOTION_PAGES.currentTruth),
    getPageBlocks(NOTION_PAGES.layer2),
    getPageBlocks(NOTION_PAGES.waitingOn),
  ])

  const conversionActs = parseConversionActs(currentTruth)
  const alsoInMotion = parseAlsoInMotion(currentTruth)

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
    alsoInMotion,
    thisWeek: [],
    waitingOn: [],
    lastSynced: new Date().toISOString(),
    rawContext,
  }
}

type PearlBoxResult = {
  results: Array<Record<string, unknown>>
}

export async function fetchPearlBox() {
  try {
    const data = await notionREST<PearlBoxResult>(
      `/databases/${NOTION_PAGES.pearlBoxDB}/query`,
      {
        method: 'POST',
        body: JSON.stringify({
          sorts: [{ timestamp: 'created_time', direction: 'descending' }],
          page_size: 20,
          filter: {
            property: 'Status',
            select: { equals: 'Inbox' },
          },
        }),
      }
    )

    return data.results.map((page) => {
      const props = page.properties as Record<string, Record<string, unknown>>
      const titleArr = props?.['Raw Content']?.title as Array<{ plain_text: string }> | undefined
      const sourceSelect = props?.Source?.select as { name: string } | null | undefined

      return {
        id: page.id as string,
        content: titleArr?.map((t) => t.plain_text).join('') || '',
        source: sourceSelect?.name ?? 'Thought',
        createdAt: page.created_time as string,
        url: page.url as string,
      }
    })
  } catch {
    return []
  }
}

const VALID_SOURCES = ['Voice', 'SMS', 'Chat', 'File', 'Email', 'Thought', 'Other'] as const

export async function createPearlBoxEntry(content: string, source: string) {
  const sourceOption = (VALID_SOURCES as readonly string[]).includes(source)
    ? source
    : 'Thought'

  const data = await notionREST<{ id: string }>('/pages', {
    method: 'POST',
    body: JSON.stringify({
      parent: { database_id: NOTION_PAGES.pearlBoxDB },
      properties: {
        'Raw Content': {
          title: [{ text: { content: content.slice(0, 2000) } }],
        },
        Source: {
          select: { name: sourceOption },
        },
        Status: {
          select: { name: 'Inbox' },
        },
        Captured: {
          date: { start: new Date().toISOString().split('T')[0] },
        },
      },
    }),
  })

  return { id: data.id }
}
