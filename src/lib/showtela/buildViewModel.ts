import type { ShowTelaHomeData, ShowTelaHydrationSummary, ShowTelaRuntimeSnapshotMeta } from './types'
import type {
  FeedItem,
  OperationEntity,
  PersonItem,
  ShowTelaViewModel,
  UnresolvedItem,
  UnresolvedPressure,
} from '@/components/showtela/types'
import type { HydratedRuntimeState } from '@/lib/runtime/runtimeHydrationModel'

// Legacy adapter — maps ShowTelaHomeData (god object) to ShowTelaViewModel.
// operationalProjection is no longer injected into the ViewModel.
// This function remains in place for the existing SSR path until Phase B
// inverts the SSR page to hydrateRuntime(). Do not add new projection coupling here.
export function buildShowTelaVM(data: ShowTelaHomeData): ShowTelaViewModel {
  return {
    activeOps: data.activeOps.map(p => ({
      id: p.id,
      name: p.name === 'TBD' ? (p.role ?? 'TBD') : p.name,
      image: p.avatar ?? '',
      latest: p.role ?? '',
      unresolvedCount: p.unresolvedCount ?? 0,
    })),
    fluencyPartners: data.fluencyPartners.map(p => ({
      id: p.id,
      name: p.name === 'TBD' ? (p.role ?? 'TBD') : p.name,
      image: p.avatar ?? '',
      latest: p.role ?? '',
      unresolvedCount: p.unresolvedCount ?? 0,
      label: p.role ?? '',
    })),
    crusadeOperations: data.operations.map(o => ({
      id: o.id,
      name: o.title,
      label: o.title,
      image: '',
      latest: o.latestMovement ?? '',
      unresolvedCount: o.unresolvedCount ?? 0,
    })),
    unresolvedPressure: {
      unresolvedCount: data.unresolved.length,
      overdueCount: data.unresolved.filter(u => u.severity === 'high').length,
      blockedCount: data.unresolved.filter(u => u.blocking).length,
      pendingApprovals: data.unresolved.filter(u => u.severity === 'medium').length,
    },
    unresolved: data.unresolved.map(u => ({
      id: u.id,
      title: u.title,
      severity: u.severity,
      blocking: u.blocking,
      operation: u.operation,
      aging: u.aging,
    })),
    feed: data.continuityFeed.map(e => ({
      id: e.id,
      timestamp: e.timestamp ?? '',
      title: e.headline,
      summary: e.summary ?? e.body ?? '',
      owner: e.owner?.name ?? '',
      image: e.image ?? '',
      avatar: '',
      unresolved: e.isNew ?? false,
      linkedEntities: e.tags ?? [],
      pressure: e.pressure,
    })),
    continuityObjects: [],
    runtimeTimeline: data.runtimeTimeline,
    source: data.source,
    diagnosticState: data.diagnosticState,
    hydration: data.hydration,
    runtimeSnapshotMeta: data.runtimeSnapshotMeta,
    // operationalProjection intentionally absent — projection is not injected into ViewModel
  }
}

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

  const personEntities = state.entities.filter(e => e.type === 'person')

  const activeOps: PersonItem[] = personEntities
    .filter(e => activeEntityIds.has(e.id))
    .slice(0, 8)
    .map(e => ({
      id: e.id,
      name: e.name,
      image: '',
      latest: e.type,
      unresolvedCount: e.unresolvedLinks,
    }))

  // Operations derived from continuity-thread objects in replay
  const threadObjects = state.operationalObjects.filter(o => o.objectType === 'continuity-thread')
  const crusadeOperations: OperationEntity[] = threadObjects.slice(0, 8).map(o => ({
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

  // Feed from recent replay decisions
  const feed: FeedItem[] = state.recentDecisions.slice(-12).map((decision, i) => ({
    id: `decision:${i}`,
    timestamp: state.diagnostics.hydratedAt,
    title: decision,
    summary: '',
    owner: '',
    image: '',
    avatar: '',
    unresolved: false,
    linkedEntities: [],
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
