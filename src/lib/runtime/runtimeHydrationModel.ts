import type { loadDurableContinuity } from './durableMemory'
import type { reconstructOperationalStateFromReplay } from './replay/reconstructOperationalState'
import type { OperationalProjection } from './state/model'

export function buildHydratedRuntimeState(input: {
  durable: Awaited<ReturnType<typeof loadDurableContinuity>>
  replay: ReturnType<typeof reconstructOperationalStateFromReplay>
  operationalProjection: OperationalProjection
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
    snapshots: input.durable.snapshots.filter((snapshot) => snapshot.snapshotKind === 'checkpoint'),
    unresolved,
    replay: input.replay,
  }
}
