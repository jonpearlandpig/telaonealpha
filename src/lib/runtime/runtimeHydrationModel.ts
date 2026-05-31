import type { loadDurableContinuity } from './durableMemory'
import type { reconstructOperationalStateFromReplay } from './replay/reconstructOperationalState'
import type { OperationalProjection } from './state/model'

// Diagnostics-only record produced by hydrateRuntime().
// Never exposed to the UI — consumed only by observability/logging paths.
// Used after SSR inversion (Phase B) to verify old authority paths are dead.
export type RuntimeDiagnostics = {
  runtimeAuthoritySource: 'hydrateRuntime' | 'unknown'
  projectionBuiltFrom: 'events' | 'cache' | 'none'
  hydrationReplaySequence: number | undefined
  objectConfirmationCount: number     // distinct object IDs produced by approved-state events
  unconfirmedObjectCount: number      // distinct object IDs produced only by non-approved events
  replayChecksum: string
  restorationChecksum: string
  replayConverged: boolean
  hydrationPassCount: number
  replayDriftDetected: boolean
  deterministicRestoration: boolean
  reconciliationConflictCount: number
  graphAssemblyAgeMs: number | undefined  // undefined until graph assembly enters the hydration path
  hydratedAt: string
}

export function buildHydratedRuntimeState(input: {
  durable: Awaited<ReturnType<typeof loadDurableContinuity>>
  replay: ReturnType<typeof reconstructOperationalStateFromReplay>
  operationalProjection: OperationalProjection
  diagnostics: RuntimeDiagnostics
}) {
  const unresolved = {
    unresolvedThreads: input.replay.state.activeThreads,
    unansweredQuestions: [] as string[],
    stalledProjects: input.replay.state.activeProjects,
    incompleteArtifacts: input.replay.state.unresolvedContinuity,
    pendingLineageChains: input.replay.state.recentLineage,
  }

  return {
    activeProjects: input.replay.state.activeProjects,
    activeEntities: input.replay.state.activeEntities,
    latestLineage: input.replay.state.recentLineage,
    pinnedContinuity: input.replay.state.pinnedContinuity,
    recentDecisions: input.replay.state.recentDecisions,
    operationalObjects: input.replay.state.operationalObjects,
    routingPlans: input.replay.state.routingPlans,
    lineageGraph: input.replay.state.lineageGraph,
    governanceLegality: input.replay.state.governanceLegality,
    operationalProjection: input.operationalProjection,
    artifacts: input.durable.artifacts,
    snapshots: input.durable.snapshots.filter((snapshot) => snapshot.snapshotKind === 'checkpoint'),
    entities: input.durable.entities,
    unresolved,
    replay: input.replay,
    diagnostics: input.diagnostics,
  }
}

export type HydratedRuntimeState = ReturnType<typeof buildHydratedRuntimeState>
