import type { ContinuityEvent } from '@/lib/showtela/types'

// Operational event kinds that represent real tour/production activity.
// Never includes infrastructure, governance, thread, or replay kinds.
export type OperationalEventKind =
  | 'show_day'
  | 'travel_day'
  | 'rehearsal'
  | 'production_day'
  | 'venue_advance'
  | 'load_in'
  | 'load_out'
  | 'meeting'
  | 'deadline'

export type OperationalEvent = {
  id: string
  kind: OperationalEventKind
  title: string
  isoDate: string
  venue?: string
  city?: string
  state?: string
  sourceArtifactId: string
  sourceContinuityKind: string
}

export type OperationalReadiness = {
  score: number
  level: 'none' | 'building' | 'ready' | 'full'
  hasUpcomingShows: boolean
  hasRehearsals: boolean
  hasVenueAdvances: boolean
  nextShowDate?: string
  nextShowTitle?: string
  crewCount: number
  blockersCount: number
}

export type OperationalMovement = {
  id: string
  kind: OperationalEventKind
  title: string
  date: string
  venue?: string
  daysUntil: number
}

// Continuity object kinds that must NEVER produce operational events.
// These are infrastructure, governance, and replay kinds — not tour activity.
const INFRASTRUCTURE_KINDS = new Set([
  'continuity-thread',
  'governance',
  'routing-plan',
  'legality-check',
  'execution',
  'authorship-guard',
  'decision',
  'entity',
])

// Title patterns that indicate infrastructure/replay artifacts rather than real events.
const INFRASTRUCTURE_TITLE_RE = /^(thread:|decision:|operator\.|continuity\.ingested|anchor.director|crew.member|department)/i

function isValidIsoDate(value?: string): boolean {
  if (!value) return false
  const t = new Date(value).getTime()
  return !Number.isNaN(t)
}

function classifyKindFromContent(coKind: string, title: string, tags: string[]): OperationalEventKind {
  if (coKind === 'show-date') return 'show_day'

  const text = `${title} ${tags.join(' ')}`.toLowerCase()

  if (text.includes('load-in') || text.includes('load_in') || /\bload in\b/.test(text)) return 'load_in'
  if (text.includes('load-out') || text.includes('load_out') || /\bload out\b/.test(text)) return 'load_out'
  if (text.includes('venue advance') || /advance.*show|show.*advance/i.test(text)) return 'venue_advance'
  if (text.includes('travel') || text.includes('fly') || /\bflight\b/.test(text) || text.includes('transit')) return 'travel_day'
  if (text.includes('rehearsal') || text.includes('soundcheck') || text.includes('sound check')) return 'rehearsal'
  if (text.includes('production day') || text.includes('call sheet') || text.includes('show day')) return 'production_day'
  if (/\bshow\b/.test(text) || text.includes('performance') || text.includes('concert')) return 'show_day'
  if (text.includes('meeting') || text.includes('call with') || text.includes('conference')) return 'meeting'
  if (text.includes('deadline') || text.includes('due date') || text.includes('submit by')) return 'deadline'

  // Any remaining dated event from a calendar-like document is a production day
  return 'production_day'
}

// Extract operationally meaningful events from the continuity feed.
// Only produces events from show-date, rehearsal, production-day, and similar tour-activity objects.
// Infrastructure, thread, governance, and replay objects are explicitly rejected.
export function extractOperationalEvents(feed: ContinuityEvent[]): OperationalEvent[] {
  const events: OperationalEvent[] = []

  for (const item of feed) {
    const co = item.continuityObject
    if (!co?.kind) continue

    // Reject infrastructure kinds immediately
    if (INFRASTRUCTURE_KINDS.has(co.kind)) continue

    // Reject infrastructure-title patterns
    const title = co.title ?? item.headline ?? ''
    if (INFRASTRUCTURE_TITLE_RE.test(title)) continue

    // Must have a valid date — no synthetic entries
    const isoDate = co.capturedAt ?? item.timestamp
    if (!isValidIsoDate(isoDate)) continue

    const kind = classifyKindFromContent(co.kind, title, item.tags ?? [])
    const linkedEntity = co.provenance?.linkedEntity ?? undefined

    events.push({
      id: `op:${item.id}`,
      kind,
      title: title || 'Operational event',
      isoDate: isoDate!,
      venue: linkedEntity,
      sourceArtifactId: item.id,
      sourceContinuityKind: co.kind,
    })
  }

  return events.sort((a, b) => a.isoDate.localeCompare(b.isoDate))
}

// Calculate readiness purely from operational events, crew count, and blocker count.
// Infrastructure events (governance outcomes, thread counts) never affect this score.
export function calculateOperationalReadiness(input: {
  operationalEvents: OperationalEvent[]
  crewCount: number
  blockersCount: number
  baseDate?: Date
}): OperationalReadiness {
  const base = input.baseDate ?? new Date()
  const futureEvents = input.operationalEvents.filter(e => isValidIsoDate(e.isoDate) && new Date(e.isoDate) >= base)

  const upcomingShows = futureEvents.filter(e => e.kind === 'show_day')
  const rehearsals = futureEvents.filter(e => e.kind === 'rehearsal')
  const venueAdvances = futureEvents.filter(e => e.kind === 'venue_advance')

  const hasUpcomingShows = upcomingShows.length > 0
  const hasRehearsals = rehearsals.length > 0
  const hasVenueAdvances = venueAdvances.length > 0

  let score = 0
  if (hasUpcomingShows) score += 40
  if (hasRehearsals) score += 20
  if (hasVenueAdvances) score += 20
  if (input.crewCount > 0) score += 20
  score -= Math.min(40, input.blockersCount * 10)
  score = Math.max(0, Math.min(100, score))

  const level: OperationalReadiness['level'] =
    score === 0 ? 'none' :
    score < 40 ? 'building' :
    score < 80 ? 'ready' : 'full'

  const nextShow = upcomingShows[0]

  return {
    score,
    level,
    hasUpcomingShows,
    hasRehearsals,
    hasVenueAdvances,
    nextShowDate: nextShow?.isoDate,
    nextShowTitle: nextShow?.title,
    crewCount: input.crewCount,
    blockersCount: input.blockersCount,
  }
}

// Pick the next 3 upcoming operational events to surface as movement cards.
// Movement is derived from real show dates, rehearsals, advances — never from thread state.
export function buildOperationalMovement(input: {
  operationalEvents: OperationalEvent[]
  baseDate?: Date
}): OperationalMovement[] {
  const base = input.baseDate ?? new Date()
  const baseMs = base.getTime()

  return input.operationalEvents
    .filter(e => isValidIsoDate(e.isoDate) && new Date(e.isoDate) >= base)
    .map(e => ({
      id: e.id,
      kind: e.kind,
      title: e.title,
      date: e.isoDate,
      venue: e.venue,
      daysUntil: Math.ceil((new Date(e.isoDate).getTime() - baseMs) / 86_400_000),
    }))
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 3)
}
