import { Client } from '@notionhq/client'
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints'
import type { ContinuityCard, ContinuityType, OpsDepartment } from '@/types/feed'

const DATABASES = {
  operationalUpdates: 'NOTION_DB_OPERATIONAL_UPDATES',
  weeklyOps: 'NOTION_DB_WEEKLY_OPS',
  touringMemory: 'NOTION_DB_TOURING_MEMORY',
  decisions: 'NOTION_DB_DECISIONS',
  staffing: 'NOTION_DB_STAFFING',
  contacts: 'NOTION_DB_CONTACTS',
  alignmentDocs: 'NOTION_DB_ALIGNMENT_DOCS',
  venueNotes: 'NOTION_DB_VENUE_NOTES',
  riskTracking: 'NOTION_DB_RISK_TRACKING',
} as const

type DbName = keyof typeof DATABASES

type ShowTelaFeed = { cards: ContinuityCard[]; opsRail: OpsDepartment[] }

const RAIL_DEPARTMENTS = ['Executive', 'Touring', 'Production', 'Venue Ops', 'Staffing', 'Marketing', 'Finance']

function getEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing required env var: ${name}`)
  return v
}

function propText(props: PageObjectResponse['properties'], keys: string[]): string {
  for (const key of keys) {
    const p = props[key]
    if (!p) continue
    if (p.type === 'title') return p.title.map((t) => t.plain_text).join('').trim()
    if (p.type === 'rich_text') return p.rich_text.map((t) => t.plain_text).join('').trim()
  }
  return ''
}
function propSelect(props: PageObjectResponse['properties'], keys: string[]): string {
  for (const key of keys) {
    const p = props[key]
    if (!p) continue
    if (p.type === 'select') return p.select?.name ?? ''
    if (p.type === 'status') return p.status?.name ?? ''
    if (p.type === 'multi_select') return p.multi_select[0]?.name ?? ''
  }
  return ''
}
function propPeople(props: PageObjectResponse['properties'], keys: string[]): string {
  for (const key of keys) {
    const p = props[key]
    if (p?.type === 'people' && p.people.length) return p.people.map((x) => ('name' in x ? x.name : '')).filter(Boolean).join(', ')
  }
  return ''
}
function propCheckbox(props: PageObjectResponse['properties'], keys: string[]): boolean {
  for (const key of keys) {
    const p = props[key]
    if (p?.type === 'checkbox') return p.checkbox
  }
  return false
}

function mapType(rawType: string, fallbackSource: string, unresolved: boolean): ContinuityType {
  const n = `${rawType} ${fallbackSource}`.toLowerCase()
  if (unresolved) return 'Unresolved'
  if (n.includes('decision')) return 'Decision'
  if (n.includes('risk')) return 'Risk'
  if (n.includes('approval')) return 'Approval'
  if (n.includes('venue')) return 'Venue Memory'
  if (n.includes('staff')) return 'Staffing Note'
  if (n.includes('tour')) return 'Touring Note'
  return 'Update'
}

function ago(iso: string): string {
  const mins = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 60) return `${mins}m ago`
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`
  return `${Math.floor(mins / 1440)}d ago`
}

function pageToCard(page: PageObjectResponse, source: string): ContinuityCard {
  const p = page.properties
  const summary = propText(p, ['Summary', 'Details', 'Body', 'Update'])
  const headline = propText(p, ['Headline', 'Title', 'Name', 'Update']) || summary || 'Operational update'
  const department = propSelect(p, ['Department', 'Team', 'Function']) || 'Executive'
  const owner = propPeople(p, ['Owner', 'Assignee']) || 'Unassigned'
  const unresolved = propCheckbox(p, ['Unresolved']) || propSelect(p, ['State', 'Status']).toLowerCase() === 'unresolved'
  const pinned = propCheckbox(p, ['Pinned'])
  const typeRaw = propSelect(p, ['Type', 'Category'])

  return {
    id: `${source}:${page.id}`,
    source,
    type: mapType(typeRaw, source, unresolved),
    department,
    owner,
    timestamp: ago(page.last_edited_time),
    unresolved,
    pinned,
    headline,
    summary: summary || headline,
    acknowledged: pinned ? 12 : unresolved ? 2 : 0,
  }
}

export function validateNotionEnv(): { missing: string[] } {
  const required = ['NOTION_API_KEY', ...Object.values(DATABASES)]
  return { missing: required.filter((k) => !process.env[k]) }
}

export async function fetchShowTelaFeed(): Promise<ShowTelaFeed> {
  const notion = new Client({ auth: getEnv('NOTION_API_KEY') })
  const entries = Object.entries(DATABASES) as [DbName, string][]
  const results = await Promise.all(entries.map(async ([source, env]) => {
    const data = await notion.databases.query({
      database_id: getEnv(env),
      page_size: source === 'operationalUpdates' ? 40 : 12,
      sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }],
    })
    return data.results.filter((r): r is PageObjectResponse => r.object === 'page').map((p) => pageToCard(p, source))
  }))

  const cards = results.flat().sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || Number(b.unresolved) - Number(a.unresolved))

  const byDept = new Map<string, OpsDepartment>()
  for (const d of RAIL_DEPARTMENTS) byDept.set(d.toLowerCase(), { id: d.toLowerCase().replace(/\s+/g, '-'), name: d, unresolvedCount: 0, active: false, latest: '—' })
  for (const c of cards) {
    const key = c.department.toLowerCase()
    const curr = byDept.get(key) ?? { id: key.replace(/\s+/g, '-'), name: c.department, unresolvedCount: 0, active: false, latest: c.timestamp }
    curr.unresolvedCount += c.unresolved ? 1 : 0
    curr.active = curr.unresolvedCount > 0
    curr.latest = c.timestamp
    byDept.set(key, curr)
  }

  return { cards: cards.slice(0, 80), opsRail: Array.from(byDept.values()) }
}
