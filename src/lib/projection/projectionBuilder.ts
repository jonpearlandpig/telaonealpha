import type { ContinuityEvent, ShowTelaHomeData, UnresolvedObject } from '@/lib/showtela/types'
import type { OperationalProjection, ProjectionBlocker, ShowProjection } from './types'

// ─── keyword sets ───────────────────────────────────────────────────────────

const RIDER_KEYWORDS = ['rider', 'technical rider', 'production rider', 'stage plot']
const CALL_SHEET_KEYWORDS = ['call sheet', 'callsheet', 'call-sheet', 'day sheet']
const ROSTER_KEYWORDS = ['roster', 'crew list', 'personnel', 'staff list', 'crew confirmed', 'roster locked', 'crew locked']
const SHOW_KEYWORDS = ['show', 'concert', 'performance', 'arena', 'theater', 'theatre', 'stadium', 'amphitheater', 'amphitheatre', 'pavilion', 'coliseum']
const VENUE_WORDS = ['arena', 'theater', 'theatre', 'stadium', 'amphitheater', 'amphitheatre', 'hall', 'centre', 'center', 'pavilion', 'coliseum']
const ACCEPTANCE_MARKERS = ['accepted', 'confirmed', 'signed', 'approved', 'received', 'issued', 'locked', 'complete', 'done', 'finalized']

// ─── text helpers ────────────────────────────────────────────────────────────

function textContains(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase()
  return keywords.some((kw) => lower.includes(kw))
}

function feedMatching(feed: ContinuityEvent[], keywords: string[]): ContinuityEvent[] {
  return feed.filter(
    (event) =>
      textContains(event.headline, keywords) ||
      textContains(event.body ?? '', keywords) ||
      textContains(event.summary ?? '', keywords) ||
      textContains(event.continuityObject?.kind ?? '', keywords) ||
      textContains(event.continuityObject?.title ?? '', keywords) ||
      (event.tags ?? []).some((tag) => textContains(tag, keywords)),
  )
}

function hasBlockingUnresolved(unresolved: UnresolvedObject[], keywords: string[]): boolean {
  return unresolved.some(
    (item) =>
      textContains(item.title, keywords) &&
      (item.blocking === true || item.severity === 'high' || item.severity === 'critical'),
  )
}

// ─── signal detection ────────────────────────────────────────────────────────

export function detectRiderAccepted(homeData: ShowTelaHomeData): boolean {
  const riderEvents = feedMatching(homeData.continuityFeed, RIDER_KEYWORDS)
  if (riderEvents.length === 0) return false
  const hasAcceptance = riderEvents.some(
    (event) =>
      textContains(event.headline, ACCEPTANCE_MARKERS) ||
      textContains(event.summary ?? '', ACCEPTANCE_MARKERS) ||
      textContains(event.continuityObject?.title ?? '', ACCEPTANCE_MARKERS),
  )
  if (!hasAcceptance) return false
  return !hasBlockingUnresolved(homeData.unresolved, RIDER_KEYWORDS)
}

export function detectCallSheetIssued(homeData: ShowTelaHomeData): boolean {
  // Finding a call sheet in the feed (the runtime captured it) is evidence it was issued.
  // An operation named after a call sheet also counts.
  const hasCallSheetSignal =
    feedMatching(homeData.continuityFeed, CALL_SHEET_KEYWORDS).length > 0 ||
    homeData.operations.some((op) => textContains(op.title, CALL_SHEET_KEYWORDS))
  if (!hasCallSheetSignal) return false
  return !hasBlockingUnresolved(homeData.unresolved, CALL_SHEET_KEYWORDS)
}

export function detectRosterLocked(homeData: ShowTelaHomeData): boolean {
  const rosterEvents = feedMatching(homeData.continuityFeed, ROSTER_KEYWORDS)
  const hasLockSignal = rosterEvents.some(
    (event) =>
      textContains(event.headline, ACCEPTANCE_MARKERS) ||
      textContains(event.summary ?? '', ACCEPTANCE_MARKERS),
  )
  if (!hasLockSignal) return false
  return !hasBlockingUnresolved(homeData.unresolved, ROSTER_KEYWORDS)
}

// ─── blocker construction ────────────────────────────────────────────────────

function severityFrom(level?: string, blocking?: boolean): ProjectionBlocker['severity'] {
  if (blocking === true || level === 'critical') return 'critical'
  if (level === 'high') return 'high'
  if (level === 'medium') return 'medium'
  return 'low'
}

function resolveOwnerForUnresolved(
  item: UnresolvedObject,
  feed: ContinuityEvent[],
): string | undefined {
  const needle = item.title.toLowerCase().slice(0, 30)
  const related = feed.find(
    (event) =>
      event.headline.toLowerCase().includes(needle) ||
      (event.waitingOn != null && item.title.toLowerCase().includes(event.waitingOn.toLowerCase())),
  )
  return related?.owner?.id
}

export function buildProjectionBlockers(homeData: ShowTelaHomeData): ProjectionBlocker[] {
  const blockers: ProjectionBlocker[] = []
  const seen = new Set<string>()

  // Primary source: unresolved items
  for (const item of homeData.unresolved) {
    const key = item.title.trim().toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    blockers.push({
      id: `blocker-unresolved-${item.id}`,
      title: item.title,
      severity: severityFrom(item.severity, item.blocking),
      ownerId: resolveOwnerForUnresolved(item, homeData.continuityFeed),
      sourceArtifact: item.operation ?? undefined,
    })
  }

  // Secondary source: high/critical feed events with an explicit blocked state
  for (const event of homeData.continuityFeed) {
    if ((event.pressure !== 'critical' && event.pressure !== 'high') || !event.blockedBy) continue
    const key = event.headline.trim().toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    blockers.push({
      id: `blocker-feed-${event.id}`,
      title: event.headline,
      severity: event.pressure === 'critical' ? 'critical' : 'high',
      ownerId: event.owner?.id,
      sourceArtifact: event.continuityObject?.kind ?? 'continuity-feed',
    })
  }

  const rank: Record<ProjectionBlocker['severity'], number> = { critical: 4, high: 3, medium: 2, low: 1 }
  return blockers.sort((a, b) => rank[b.severity] - rank[a.severity])
}

// ─── scoring ─────────────────────────────────────────────────────────────────

export function calculateReadiness(
  riderAccepted: boolean,
  callSheetIssued: boolean,
  rosterLocked: boolean,
  blockers: ProjectionBlocker[],
): number {
  const hasCriticalBlocker = blockers.some((b) => b.severity === 'critical')
  const deduction =
    (!riderAccepted ? 25 : 0) +
    (!callSheetIssued ? 25 : 0) +
    (!rosterLocked ? 25 : 0) +
    (hasCriticalBlocker ? 25 : 0)
  return Math.max(0, 100 - deduction)
}

export function calculateOpenPressure(blockers: ProjectionBlocker[]): number {
  return blockers.reduce((total, blocker) => {
    const weight =
      blocker.severity === 'critical' ? 10 :
      blocker.severity === 'high' ? 5 :
      blocker.severity === 'medium' ? 2 : 1
    return total + weight
  }, 0)
}

// ─── show detection ───────────────────────────────────────────────────────────

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000)
}

function tryParseDate(text: string): Date | null {
  const isoMatch = text.match(/\d{4}-\d{2}-\d{2}/)
  if (isoMatch) {
    const d = new Date(isoMatch[0])
    if (!isNaN(d.getTime())) return d
  }
  const monthMatch = text.match(
    /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2}),?\s+(\d{4})\b/i,
  )
  if (monthMatch) {
    const d = new Date(`${monthMatch[1]} ${monthMatch[2]}, ${monthMatch[3]}`)
    if (!isNaN(d.getTime())) return d
  }
  return null
}

function extractVenue(text: string): string {
  const words = text.split(/\s+/)
  for (let i = 0; i < words.length; i++) {
    if (VENUE_WORDS.some((vw) => words[i].toLowerCase().includes(vw))) {
      const start = Math.max(0, i - 2)
      const end = Math.min(words.length, i + 1)
      return words.slice(start, end).join(' ')
    }
  }
  return 'unknown'
}

export function findNextShow(homeData: ShowTelaHomeData, baseDate = new Date()): ShowProjection | undefined {
  const showOps = homeData.operations.filter(
    (op) =>
      textContains(op.title, SHOW_KEYWORDS) ||
      textContains(op.latestMovement ?? '', SHOW_KEYWORDS),
  )
  const showFeedEvents = feedMatching(homeData.continuityFeed, SHOW_KEYWORDS)
    .filter((event) => event.timestamp != null)
    .sort((a, b) => new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime())

  if (showOps.length === 0 && showFeedEvents.length === 0) return undefined

  const primaryOp = showOps[0]
  const primaryFeed = showFeedEvents[0]

  const dateSource = [
    primaryFeed?.timestamp,
    primaryOp?.latestMovement,
    primaryOp?.status,
    primaryFeed?.continuityObject?.provenance?.when,
  ]
    .filter(Boolean)
    .join(' ')

  const parsedDate = tryParseDate(dateSource)
  const showDate = parsedDate != null && parsedDate > baseDate ? parsedDate : null

  const venueSource = [
    primaryOp?.title,
    primaryFeed?.headline,
    primaryFeed?.continuityObject?.provenance?.what,
    primaryFeed?.body,
  ]
    .filter(Boolean)
    .join(' ')

  const venue = extractVenue(venueSource)
  const city = primaryFeed?.continuityObject?.provenance?.linkedEntity ?? 'unknown'
  const showId = primaryOp?.id ?? primaryFeed?.id ?? 'show-unknown'

  const allBlockers = buildProjectionBlockers(homeData)
  const riderAccepted = detectRiderAccepted(homeData)
  const callSheetIssued = detectCallSheetIssued(homeData)
  const rosterLocked = detectRosterLocked(homeData)
  const readiness = calculateReadiness(riderAccepted, callSheetIssued, rosterLocked, allBlockers)

  const owners = homeData.activeOps
    .filter((p) => p.pressure === 'high' || p.pressure === 'critical' || (p.unresolvedCount ?? 0) > 0)
    .map((p) => p.id)

  return {
    showId,
    venue,
    city,
    date: showDate != null ? showDate.toISOString().slice(0, 10) : 'unknown',
    readiness,
    riderAccepted,
    callSheetIssued,
    rosterLocked,
    blockers: allBlockers,
    owners,
    daysUntilShow: showDate != null ? daysBetween(baseDate, showDate) : -1,
  }
}

// ─── next meaningful movement ─────────────────────────────────────────────────

function deriveNextMeaningfulMovement(
  blockers: ProjectionBlocker[],
  riderAccepted: boolean,
  callSheetIssued: boolean,
  rosterLocked: boolean,
  homeData: ShowTelaHomeData,
): string | undefined {
  const criticalOwned = blockers.find((b) => b.severity === 'critical' && b.ownerId != null)
  if (criticalOwned) {
    const owner = homeData.activeOps.find((p) => p.id === criticalOwned.ownerId)
    return `${owner?.name ?? criticalOwned.ownerId} needs to resolve: ${criticalOwned.title}`
  }

  const criticalUnowned = blockers.find((b) => b.severity === 'critical')
  if (criticalUnowned) return `Assign owner to critical blocker: ${criticalUnowned.title}`

  if (!riderAccepted) return 'Get rider confirmed by venue'
  if (!callSheetIssued) return 'Issue call sheet to departments'
  if (!rosterLocked) return 'Lock crew roster'

  const highBlocker = blockers.find((b) => b.severity === 'high')
  if (highBlocker) {
    const owner = highBlocker.ownerId != null
      ? homeData.activeOps.find((p) => p.id === highBlocker.ownerId)
      : null
    return owner
      ? `${owner.name} to confirm: ${highBlocker.title}`
      : `Resolve: ${highBlocker.title}`
  }

  if (blockers.length === 0) return 'No active blockers — hold current plan'
  return undefined
}

// ─── main builder ─────────────────────────────────────────────────────────────

export function buildOperationalProjection(
  homeData: ShowTelaHomeData,
  baseDate = new Date(),
): OperationalProjection {
  const activeBlockers = buildProjectionBlockers(homeData)
  const riderAccepted = detectRiderAccepted(homeData)
  const callSheetIssued = detectCallSheetIssued(homeData)
  const rosterLocked = detectRosterLocked(homeData)
  const readinessScore = calculateReadiness(riderAccepted, callSheetIssued, rosterLocked, activeBlockers)
  const openPressure = calculateOpenPressure(activeBlockers)
  const nextShow = findNextShow(homeData, baseDate)
  const nextMeaningfulMovement = deriveNextMeaningfulMovement(
    activeBlockers,
    riderAccepted,
    callSheetIssued,
    rosterLocked,
    homeData,
  )

  return {
    nextShow,
    activeBlockers,
    readinessScore,
    openPressure,
    nextMeaningfulMovement,
  }
}
