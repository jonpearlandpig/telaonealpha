import type { ShowTelaHydrationSummary, ShowTelaRuntimeSnapshotMeta } from './types'
import type {
  FeedItem,
  OperationEntity,
  PersonItem,
  ShowTelaViewModel,
  UnresolvedItem,
  UnresolvedPressure,
} from '@/components/showtela/types'
import type { HydratedRuntimeState } from '@/lib/runtime/runtimeHydrationModel'

// Sovereign adapter — maps HydratedRuntimeState (event-derived runtime truth) to ShowTelaViewModel.
// This is the target path after Phase B SSR inversion. operationalProjection is never
// passed to the ViewModel from this function — the ViewModel carries display data only.
//
// Display gaps where Notion-sourced metadata is absent are intentional:
// truthful gaps > fabricated continuity.
export function buildShowTelaVMFromHydratedState(
  state: HydratedRuntimeState,
): ShowTelaViewModel {
  // Person entities from the durable store, filtered to those active in replay
  const activeEntityIds = new Set(
    state.operationalObjects
      .filter(o => o.objectType === 'entity')
      .map(o => (typeof o.payload.entityId === 'string' ? o.payload.entityId : null))
      .filter((id): id is string => id !== null),
  )

  // TEMPORARY VISIBILITY FIX (Session 1C-B):
  // Replay entity IDs from events may be raw name strings ("Juan Otero") rather than
  // slugged durable IDs ("person:juan-otero"). Match by lowercased name from the
  // continuity feed as a stopgap. Canonical repair: Anchor Directory → stable
  // person:{slug} → replay entity IDs. That work belongs to Session 1D.
  const activeEntityNamesFromFeed = new Set<string>()
  for (const event of state.continuityFeed) {
    if (event.owner?.name) activeEntityNamesFromFeed.add(event.owner.name.toLowerCase().trim())
    for (const entity of event.linkedEntities ?? []) {
      activeEntityNamesFromFeed.add(entity.toLowerCase().trim())
    }
  }

  const personEntities = state.entities.filter(e => e.type === 'person')

  const activeOps: PersonItem[] = personEntities
    .filter(e =>
      activeEntityIds.has(e.id) ||
      activeEntityNamesFromFeed.has(e.name.toLowerCase().trim()),
    )
    .slice(0, 8)
    .map(e => ({
      id: e.id,
      name: e.name,
      image: '',
      latest: e.type,
      unresolvedCount: e.unresolvedLinks,
    }))

  // Operations rail — three-tier resolution, no inference by regex.
  //
  // Tier 1: continuityObject.provenance.linkedOperation — exact string the user
  //   selected from the Crusade dropdown. Highest authority.
  // Tier 2: state.activeProjects — project strings already validated by projectRefs()
  //   during replay ingestion. Cross-referenced with feed for timestamps.
  // Tier 3: continuity-thread objects from replay (raw thread IDs — current fallback).
  const threadObjects = state.operationalObjects.filter(o => o.objectType === 'continuity-thread')

  const explicitOperations = new Map<string, string>()
  for (const event of state.continuityFeed) {
    const op = event.continuityObject?.provenance?.linkedOperation
    if (!op) continue
    const at = event.timestamp ?? state.diagnostics.hydratedAt
    if (!explicitOperations.has(op) || at > (explicitOperations.get(op) ?? '')) {
      explicitOperations.set(op, at)
    }
  }

  const activeProjectSet = new Set(state.activeProjects)
  const replayProjectTimestamps = new Map<string, string>()
  for (const event of state.continuityFeed) {
    for (const entity of event.linkedEntities ?? []) {
      if (!activeProjectSet.has(entity)) continue
      const at = event.timestamp ?? state.diagnostics.hydratedAt
      if (!replayProjectTimestamps.has(entity) || at > (replayProjectTimestamps.get(entity) ?? '')) {
        replayProjectTimestamps.set(entity, at)
      }
    }
  }
  const replayProjects = new Map<string, string>(
    state.activeProjects.map(p => [p, replayProjectTimestamps.get(p) ?? state.diagnostics.hydratedAt]),
  )

  const crusadeOperations: OperationEntity[] = explicitOperations.size > 0
    ? [...explicitOperations.entries()].slice(0, 8).map(([name, latest], i) => ({
        id: `op:explicit:${i}`,
        name,
        label: 'active',
        image: '',
        latest,
        unresolvedCount: 0,
      }))
    : replayProjects.size > 0
      ? [...replayProjects.entries()].slice(0, 8).map(([name, latest], i) => ({
          id: `op:replay:${i}`,
          name,
          label: 'active',
          image: '',
          latest,
          unresolvedCount: 0,
        }))
      : threadObjects.slice(0, 8).map(o => ({
          id: o.id,
          name: typeof o.payload.threadId === 'string' ? o.payload.threadId : o.id,
          label: o.status,
          image: '',
          latest: o.updatedAt,
          unresolvedCount: 0,
        }))

  // Unresolved items from replay reconstruction
  const unresolved: UnresolvedItem[] = state.unresolved.incompleteArtifacts.map(id => ({
    id: `unresolved:${id}`,
    title: id,
    severity: 'medium' as const,
  }))

  const unresolvedPressure: UnresolvedPressure = {
    unresolvedCount: state.unresolved.incompleteArtifacts.length,
    overdueCount: 0,
    blockedCount: 0,
    pendingApprovals: 0,
  }

  // Feed from continuity artifacts (newest first — reverse-chronological dispatch order)
  const feed: FeedItem[] = state.continuityFeed.slice(0, 12).map(event => ({
    id: event.id,
    timestamp: event.timestamp ?? state.diagnostics.hydratedAt,
    title: event.headline,
    summary: event.summary ?? '',
    owner: event.owner?.name ?? '',
    image: '',
    avatar: '',
    unresolved: false,
    linkedEntities: event.linkedEntities ?? [],
    pressure: event.pressure,
  }))

  const hydration: ShowTelaHydrationSummary = {
    connectedToNotion: false,  // hydrateRuntime() does not call Notion
    connectedToSupabase: true,
    counts: {
      people: personEntities.length,
      operations: threadObjects.length,
      continuity: state.operationalObjects.length,
      unresolved: state.unresolved.incompleteArtifacts.length,
      artifacts: state.entities.length,
    },
    lastHydratedAt: state.diagnostics.hydratedAt,
    cacheSource: 'supabase',
  }

  const latestSnapshot = state.snapshots.at(-1)
  const runtimeSnapshotMeta: ShowTelaRuntimeSnapshotMeta | undefined = latestSnapshot
    ? {
        snapshotId: latestSnapshot.id,
        workspaceId: state.replay.state.activeProjects[0] ?? 'unknown',
        updatedAt: latestSnapshot.createdAt,
        canonical: true,
        overwriteMode: 'merge',
        sourceIngest: 'continuity',
      }
    : undefined

  return {
    activeOps,
    fluencyPartners: [],  // no fluency partner classification in replay layer yet
    crusadeOperations,
    unresolvedPressure,
    unresolved,
    feed,
    continuityObjects: [],
    runtimeTimeline: [],
    source: 'supabase',
    diagnosticState: 'persistence-connected',
    hydration,
    runtimeSnapshotMeta,
    // operationalProjection intentionally absent — sovereign path does not inject projection into ViewModel
  }
}
