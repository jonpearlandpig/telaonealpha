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
import { PERSON_AUTHORITY_ALLOWED } from '@/lib/entities/entityEngine'
import type { OperationalEvent } from '@/lib/runtime/operational/operationalExtraction'

// Sovereign adapter — maps HydratedRuntimeState (event-derived runtime truth) to ShowTelaViewModel.
// This is the target path after Phase B SSR inversion. operationalProjection is never
// passed to the ViewModel from this function — the ViewModel carries display data only.
//
// Display gaps where Notion-sourced metadata is absent are intentional:
// truthful gaps > fabricated continuity.
export function buildShowTelaVMFromHydratedState(
  state: HydratedRuntimeState,
): ShowTelaViewModel {
  // Person entities — only those with verified authority may appear as operational anchors.
  // Relay-derived names (linkedEntities, feed owner strings) are intentionally excluded
  // to prevent venue names, department labels, and regex artifacts from entering ActiveOps.
  const personEntities = state.entities.filter(e => e.type === 'person')

  const activeOps: PersonItem[] = personEntities
    .filter(e => e.authoritySource != null && PERSON_AUTHORITY_ALLOWED.has(e.authoritySource))
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

  // Departments from rider — context entities tagged rider-department
  const departments: OperationEntity[] = state.entities
    .filter(e => e.id.startsWith('rider-dept:'))
    .slice(0, 16)
    .map((e, i) => ({
      id: `dept:${i}:${e.id}`,
      name: e.name,
      label: 'active',
      image: '',
      latest: e.lastSeen,
      unresolvedCount: e.unresolvedLinks,
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
  // Deduplicate by ID before slicing — duplicate OCIDs cause React key collisions in the feed
  const seenFeedIds = new Set<string>()
  const feed: FeedItem[] = state.continuityFeed
    .filter(event => {
      if (seenFeedIds.has(event.id)) return false
      seenFeedIds.add(event.id)
      return true
    })
    .slice(0, 12)
    .map(event => ({
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

  // Operational events — show dates, rehearsals, advances extracted from durable artifacts.
  // These are the clean operational truth; infrastructure events are excluded upstream.
  const operationalEvents: OperationalEvent[] = state.operationalEvents ?? []

  return {
    activeOps,
    fluencyPartners: [],  // no fluency partner classification in replay layer yet
    crusadeOperations,
    departments,
    unresolvedPressure,
    unresolved,
    feed,
    operationalEvents,
    continuityObjects: [],
    runtimeTimeline: [],
    source: 'supabase',
    diagnosticState: 'persistence-connected',
    hydration,
    runtimeSnapshotMeta,
    // operationalProjection intentionally absent — sovereign path does not inject projection into ViewModel
  }
}
