import crypto from 'crypto'

import { createRuntimeEvent, type RuntimeEvent, type RuntimeEventPayload } from '@/lib/runtime/runtimeTypes'

export const READINESS_STATUSES = ['GREEN', 'YELLOW', 'RED', 'UNKNOWN'] as const

export type ReadinessStatus = (typeof READINESS_STATUSES)[number]

export type ReadinessSectionSet = {
  greenItems: string[]
  yellowItems: string[]
  redItems: string[]
  blockingItems: string[]
  recommendedActions: string[]
  notes: string
}

export type ReadinessEvidenceKind =
  | 'continuity_event'
  | 'artifact'
  | 'entity'
  | 'timeline_event'
  | 'calendar_event'
  | 'future_decision'
  | 'future_risk'
  | 'future_assumption'

export type ReadinessEvidenceLink = {
  id: string
  kind: ReadinessEvidenceKind
  refId: string
  label: string
  metadata?: Record<string, unknown>
}

export type ReadinessHistoryEntry = {
  id: string
  status: ReadinessStatus
  summary: string
  blockingItems: string[]
  recordedAt: string
  sourceEventId?: string
}

export type ReadinessReview = {
  reviewId: string
  workspaceId: string
  showTelaId: string
  title: string
  description: string
  owner: string
  status: ReadinessStatus
  createdAt: string
  updatedAt: string
  reviewDate: string
  scope: string
  sections: ReadinessSectionSet
  evidenceLinks: ReadinessEvidenceLink[]
  history: ReadinessHistoryEntry[]
}

type ReadinessReviewDbRow = {
  review_id: string
  workspace_id: string
  showtela_id: string
  title: string
  description: string | null
  owner: string
  status: string
  created_at: string
  updated_at: string
  review_date: string
  scope: string
  sections: unknown
  evidence_links: unknown
  history: unknown
}

type ReadinessReviewPayload = RuntimeEventPayload & {
  reviewId: string
  showTelaId: string
  title: string
  description?: string
  owner: string
  status: ReadinessStatus
  reviewDate: string
  scope: string
  sections: ReadinessSectionSet
  evidenceLinks: ReadinessEvidenceLink[]
  historyEntry: ReadinessHistoryEntry
}

export const SHOWTELA_READINESS_EVENT_TYPES = {
  created: 'showtela.readiness.review.created',
  updated: 'showtela.readiness.review.updated',
} as const

function stringValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function stringList(value: unknown) {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
    : []
}

export function isReadinessStatus(value: unknown): value is ReadinessStatus {
  return typeof value === 'string' && READINESS_STATUSES.includes(value as ReadinessStatus)
}

export function normalizeReadinessSections(value: unknown): ReadinessSectionSet {
  const record = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}

  return {
    greenItems: stringList(record.greenItems),
    yellowItems: stringList(record.yellowItems),
    redItems: stringList(record.redItems),
    blockingItems: stringList(record.blockingItems),
    recommendedActions: stringList(record.recommendedActions),
    notes: stringValue(record.notes),
  }
}

export function normalizeReadinessEvidenceLinks(value: unknown): ReadinessEvidenceLink[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return []
    const record = item as Record<string, unknown>
    const refId = stringValue(record.refId)
    const label = stringValue(record.label)
    const kind = stringValue(record.kind) as ReadinessEvidenceKind
    if (!refId || !label || !kind) return []

    return [{
      id: stringValue(record.id) || `evidence-${index + 1}`,
      kind,
      refId,
      label,
      metadata: record.metadata && typeof record.metadata === 'object' && !Array.isArray(record.metadata)
        ? record.metadata as Record<string, unknown>
        : undefined,
    }]
  })
}

export function normalizeReadinessHistory(value: unknown): ReadinessHistoryEntry[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return []
    const record = item as Record<string, unknown>
    const status = record.status
    const recordedAt = stringValue(record.recordedAt)
    if (!isReadinessStatus(status) || !recordedAt) return []

    return [{
      id: stringValue(record.id) || `history-${index + 1}`,
      status,
      summary: stringValue(record.summary),
      blockingItems: stringList(record.blockingItems),
      recordedAt,
      sourceEventId: stringValue(record.sourceEventId) || undefined,
    }]
  })
}

export function createReadinessHistoryEntry(input: {
  status: ReadinessStatus
  summary?: string
  blockingItems?: string[]
  recordedAt?: string
}): ReadinessHistoryEntry {
  return {
    id: crypto.randomUUID(),
    status: input.status,
    summary: input.summary?.trim() || `Readiness recorded as ${input.status}.`,
    blockingItems: input.blockingItems?.filter(Boolean) ?? [],
    recordedAt: input.recordedAt ?? new Date().toISOString(),
  }
}

export function buildReadinessReviewsFromEvents(
  events: RuntimeEvent[],
  options?: { showTelaId?: string },
): ReadinessReview[] {
  const reviews = new Map<string, ReadinessReview>()
  const ordered = [...events].sort((left, right) => {
    const sequenceDelta = (left.replaySequence ?? 0) - (right.replaySequence ?? 0)
    return sequenceDelta !== 0 ? sequenceDelta : left.createdAt.localeCompare(right.createdAt)
  })

  for (const event of ordered) {
    if (
      event.type !== SHOWTELA_READINESS_EVENT_TYPES.created &&
      event.type !== SHOWTELA_READINESS_EVENT_TYPES.updated
    ) {
      continue
    }

    const payload = event.payload as ReadinessReviewPayload | undefined
    if (!payload?.reviewId || !payload.showTelaId) continue
    if (options?.showTelaId && payload.showTelaId !== options.showTelaId) continue
    if (!isReadinessStatus(payload.status)) continue

    const historyEntry = normalizeReadinessHistory([payload.historyEntry])[0]
    if (!historyEntry) continue

    const existing = reviews.get(payload.reviewId)
    const history = dedupeHistory([
      ...(existing?.history ?? []),
      {
        ...historyEntry,
        sourceEventId: historyEntry.sourceEventId ?? event.id,
      },
    ])

    reviews.set(payload.reviewId, {
      reviewId: payload.reviewId,
      workspaceId: event.workspaceId ?? existing?.workspaceId ?? '',
      showTelaId: payload.showTelaId,
      title: stringValue(payload.title) || existing?.title || 'Readiness Review',
      description: stringValue(payload.description) || existing?.description || '',
      owner: stringValue(payload.owner) || existing?.owner || '',
      status: payload.status,
      createdAt: existing?.createdAt ?? event.createdAt,
      updatedAt: event.createdAt,
      reviewDate: stringValue(payload.reviewDate) || existing?.reviewDate || event.createdAt,
      scope: stringValue(payload.scope) || existing?.scope || '',
      sections: normalizeReadinessSections(payload.sections),
      evidenceLinks: normalizeReadinessEvidenceLinks(payload.evidenceLinks),
      history,
    })
  }

  return [...reviews.values()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
}

export function hydrateReadinessReviewFromRow(row: ReadinessReviewDbRow): ReadinessReview {
  return {
    reviewId: row.review_id,
    workspaceId: row.workspace_id,
    showTelaId: row.showtela_id,
    title: row.title,
    description: row.description ?? '',
    owner: row.owner,
    status: isReadinessStatus(row.status) ? row.status : 'UNKNOWN',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    reviewDate: row.review_date,
    scope: row.scope,
    sections: normalizeReadinessSections(row.sections),
    evidenceLinks: normalizeReadinessEvidenceLinks(row.evidence_links),
    history: normalizeReadinessHistory(row.history),
  }
}

export async function listReadinessReviews(input: {
  workspaceId: string
  showTelaId?: string
}): Promise<ReadinessReview[]> {
  const { getSupabaseServerClient } = await import('@/lib/supabase/server')
  const supabase = getSupabaseServerClient()
  let query = supabase
    .from('readiness_reviews')
    .select('*')
    .eq('workspace_id', input.workspaceId)
    .order('updated_at', { ascending: false })

  if (input.showTelaId) {
    query = query.eq('showtela_id', input.showTelaId)
  }

  const { data, error } = await query
  if (error) throw new Error(`listReadinessReviews: ${error.message}`)

  return ((data ?? []) as ReadinessReviewDbRow[]).map(hydrateReadinessReviewFromRow)
}

export async function createReadinessReview(input: {
  workspaceId: string
  showTelaId: string
  title: string
  description?: string
  owner: string
  status: ReadinessStatus
  reviewDate: string
  scope: string
  sections: ReadinessSectionSet
  evidenceLinks: ReadinessEvidenceLink[]
  historySummary?: string
}) {
  const now = new Date().toISOString()
  const reviewId = crypto.randomUUID()
  const historyEntry = createReadinessHistoryEntry({
    status: input.status,
    summary: input.historySummary,
    blockingItems: input.sections.blockingItems,
    recordedAt: now,
  })

  const review: ReadinessReview = {
    reviewId,
    workspaceId: input.workspaceId,
    showTelaId: input.showTelaId,
    title: input.title.trim(),
    description: input.description?.trim() ?? '',
    owner: input.owner.trim(),
    status: input.status,
    createdAt: now,
    updatedAt: now,
    reviewDate: input.reviewDate,
    scope: input.scope.trim(),
    sections: normalizeReadinessSections(input.sections),
    evidenceLinks: normalizeReadinessEvidenceLinks(input.evidenceLinks),
    history: [historyEntry],
  }

  await persistReadinessReview(review)
  await persistReadinessReviewEvent(SHOWTELA_READINESS_EVENT_TYPES.created, review, historyEntry)

  return review
}

export async function updateReadinessReview(input: {
  workspaceId: string
  reviewId: string
  title?: string
  description?: string
  owner?: string
  status?: ReadinessStatus
  reviewDate?: string
  scope?: string
  sections?: ReadinessSectionSet
  evidenceLinks?: ReadinessEvidenceLink[]
  historySummary?: string
}) {
  const existing = await getReadinessReview(input.workspaceId, input.reviewId)
  if (!existing) {
    throw new Error(`Readiness review ${input.reviewId} not found.`)
  }

  const nextSections = input.sections
    ? normalizeReadinessSections(input.sections)
    : existing.sections
  const nextEvidenceLinks = input.evidenceLinks
    ? normalizeReadinessEvidenceLinks(input.evidenceLinks)
    : existing.evidenceLinks
  const nextStatus = input.status ?? existing.status
  const updatedAt = new Date().toISOString()

  const historyEntry = createReadinessHistoryEntry({
    status: nextStatus,
    summary: input.historySummary ?? inferReadinessSummary(existing, nextStatus, nextSections),
    blockingItems: nextSections.blockingItems,
    recordedAt: updatedAt,
  })

  const review: ReadinessReview = {
    ...existing,
    title: input.title?.trim() || existing.title,
    description: input.description?.trim() ?? existing.description,
    owner: input.owner?.trim() || existing.owner,
    status: nextStatus,
    updatedAt,
    reviewDate: input.reviewDate ?? existing.reviewDate,
    scope: input.scope?.trim() || existing.scope,
    sections: nextSections,
    evidenceLinks: nextEvidenceLinks,
    history: dedupeHistory([...existing.history, historyEntry]),
  }

  await persistReadinessReview(review)
  await persistReadinessReviewEvent(SHOWTELA_READINESS_EVENT_TYPES.updated, review, historyEntry)

  return review
}

async function getReadinessReview(workspaceId: string, reviewId: string): Promise<ReadinessReview | null> {
  const { getSupabaseServerClient } = await import('@/lib/supabase/server')
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from('readiness_reviews')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('review_id', reviewId)
    .maybeSingle()

  if (error) throw new Error(`getReadinessReview: ${error.message}`)
  if (!data) return null
  return hydrateReadinessReviewFromRow(data as ReadinessReviewDbRow)
}

async function persistReadinessReview(review: ReadinessReview) {
  const { getSupabaseServerClient } = await import('@/lib/supabase/server')
  const supabase = getSupabaseServerClient()
  const { error } = await supabase
    .from('readiness_reviews')
    .upsert({
      review_id: review.reviewId,
      workspace_id: review.workspaceId,
      showtela_id: review.showTelaId,
      title: review.title,
      description: review.description,
      owner: review.owner,
      status: review.status,
      created_at: review.createdAt,
      updated_at: review.updatedAt,
      review_date: review.reviewDate,
      scope: review.scope,
      sections: review.sections,
      evidence_links: review.evidenceLinks,
      history: review.history,
    }, { onConflict: 'review_id' })

  if (error) throw new Error(`persistReadinessReview: ${error.message}`)
}

async function persistReadinessReviewEvent(
  type: string,
  review: ReadinessReview,
  historyEntry: ReadinessHistoryEntry,
) {
  const event = createRuntimeEvent<ReadinessReviewPayload>({
    workspaceId: review.workspaceId,
    type,
    payloadType: 'showtela.readiness.review',
    source: 'system',
    governanceState: 'approved',
    executionState: 'completed',
    lineageId: review.reviewId,
    payload: {
      reviewId: review.reviewId,
      showTelaId: review.showTelaId,
      title: review.title,
      description: review.description,
      owner: review.owner,
      status: review.status,
      reviewDate: review.reviewDate,
      scope: review.scope,
      sections: review.sections,
      evidenceLinks: review.evidenceLinks,
      historyEntry,
      linkedEntities: review.evidenceLinks
        .filter((link) => link.kind === 'entity')
        .map((link) => link.refId),
      threadId: `readiness:${review.reviewId}`,
    },
  })

  const result = await persistRuntimeEvent(event)
  if (!result.persisted) {
    throw new Error(result.error ?? 'Failed to persist readiness review event.')
  }
}

async function persistRuntimeEvent(event: RuntimeEvent) {
  const eventStore = await import('@/lib/runtime/eventStore')
  return eventStore.persistRuntimeEvent(event)
}

function dedupeHistory(history: ReadinessHistoryEntry[]) {
  const byId = new Map<string, ReadinessHistoryEntry>()
  for (const entry of history) {
    byId.set(entry.id, entry)
  }
  return [...byId.values()].sort((left, right) => left.recordedAt.localeCompare(right.recordedAt))
}

function inferReadinessSummary(
  previous: ReadinessReview,
  nextStatus: ReadinessStatus,
  nextSections: ReadinessSectionSet,
) {
  if (previous.status !== nextStatus) {
    return `Readiness moved from ${previous.status} to ${nextStatus}.`
  }
  if (previous.sections.blockingItems.join('|') !== nextSections.blockingItems.join('|')) {
    return 'Blocking items updated.'
  }
  return `Readiness review updated under ${nextStatus}.`
}
