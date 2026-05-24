import { threadContinuity } from './threadContinuity'
import type {
  ContinuityEvent,
  OperationEntity,
  PersonEntity,
  RuntimeTimelineItem,
  ShowTelaHomeData,
  ShowTelaRuntimeSnapshotMeta,
  UnresolvedObject,
} from './types'

function timelineFromFeed(feed: ContinuityEvent[]): RuntimeTimelineItem[] {
  return feed.slice(0, 20).map((event, idx) => ({
    id: `timeline-${event.id}`,
    timestamp: event.timestamp ?? new Date().toISOString(),
    actor: event.owner?.name ?? 'Operations',
    summary: event.headline,
    continuityObjectId: event.continuityObject?.id ?? event.threadId ?? event.id,
    pressureDelta: (
      (event.pressure === 'high' ? 2 : event.pressure === 'medium' ? 1 : 0) -
      (idx > 0 && feed[idx - 1]?.pressure === 'high' ? 1 : 0)
    ) as -2 | -1 | 0 | 1 | 2,
  }))
}

function mergeByKey<T>(primary: T[], secondary: T[], key: (item: T) => string) {
  const merged = new Map<string, T>()
  for (const item of [...primary, ...secondary]) {
    const itemKey = key(item)
    if (!itemKey) continue
    if (!merged.has(itemKey)) merged.set(itemKey, item)
  }
  return [...merged.values()]
}

export function createRuntimeSnapshotMeta(input: {
  snapshotId: string
  workspaceId: string
  updatedAt: string
  overwriteMode: 'merge' | 'replace'
  sourceIngest: 'continuity' | 'directory'
}): ShowTelaRuntimeSnapshotMeta {
  return {
    snapshotId: input.snapshotId,
    workspaceId: input.workspaceId,
    updatedAt: input.updatedAt,
    canonical: true,
    overwriteMode: input.overwriteMode,
    sourceIngest: input.sourceIngest,
  }
}

export function isCanonicalRuntimeSnapshot(data: ShowTelaHomeData | null | undefined): boolean {
  return Boolean(data?.runtimeSnapshotMeta?.canonical)
}

export function mergeCachedSnapshot(base: ShowTelaHomeData, cached: ShowTelaHomeData): ShowTelaHomeData {
  const activeOps = mergeByKey<PersonEntity>(
    base.activeOps,
    cached.activeOps,
    (person) => person.id || person.name.toLowerCase(),
  )
  const fluencyPartners = mergeByKey<PersonEntity>(
    base.fluencyPartners,
    cached.fluencyPartners,
    (person) => person.id || person.name.toLowerCase(),
  )
  const operations = mergeByKey<OperationEntity>(
    base.operations,
    cached.operations,
    (operation) => operation.id || operation.title.toLowerCase(),
  )
  const unresolved = mergeByKey<UnresolvedObject>(
    base.unresolved,
    cached.unresolved,
    (item) => item.id || item.title.toLowerCase(),
  )
  const continuityFeed = mergeByKey<ContinuityEvent>(
    cached.continuityFeed,
    base.continuityFeed,
    (event) => event.id,
  )
    .sort((left, right) => new Date(right.timestamp ?? 0).getTime() - new Date(left.timestamp ?? 0).getTime())
    .slice(0, 50)

  const high = unresolved.filter((item) => item.severity === 'high').length
  const medium = unresolved.filter((item) => item.severity === 'medium').length

  return {
    ...base,
    activeOps,
    fluencyPartners,
    operations,
    unresolved,
    continuityFeed,
    pressureSummary: { total: unresolved.length, high, medium },
    runtimeTimeline: timelineFromFeed(continuityFeed),
    runtimeSnapshotMeta: cached.runtimeSnapshotMeta,
  }
}

export function replaceHomeWithDirectoryIngest(input: {
  base: ShowTelaHomeData
  event: ContinuityEvent
  people: PersonEntity[]
  operations: OperationEntity[]
  meta: ShowTelaRuntimeSnapshotMeta
}): ShowTelaHomeData {
  const continuityFeed = threadContinuity([input.event])
    .sort((left, right) => new Date(right.timestamp ?? 0).getTime() - new Date(left.timestamp ?? 0).getTime())
    .slice(0, 50)

  return {
    ...input.base,
    activeOps: input.people.slice(0, 20),
    fluencyPartners: [],
    operations: input.operations,
    unresolved: [],
    continuityFeed,
    pressureSummary: { total: 0, high: 0, medium: 0 },
    runtimeTimeline: timelineFromFeed(continuityFeed),
    source: 'supabase',
    diagnosticState: 'persistence-connected',
    runtimeSnapshotMeta: input.meta,
  }
}

export function resolveRefreshHomeData(fresh: ShowTelaHomeData, cached: ShowTelaHomeData | null): ShowTelaHomeData {
  if (!cached) return fresh
  if (isCanonicalRuntimeSnapshot(cached)) return cached
  return mergeCachedSnapshot(fresh, cached)
}
