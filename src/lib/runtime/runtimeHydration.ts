import { createReplayCheckpointSnapshot, selectBestReplayCheckpoint } from './continuitySnapshots'
import { loadDurableContinuity } from './durableMemory'
import { getAllReplayEventsForWorkspace } from './eventStore'
import { reconstructOperationalStateFromReplay } from './replay/reconstructOperationalState'
import { persistSnapshot } from './snapshotPersistence'
import { buildHydratedRuntimeState } from './runtimeHydrationModel'

function snapshotProvenance(sourceId: string) {
  const now = new Date().toISOString()
  return {
    sourceType: 'runtime-replay',
    sourceId,
    truthRank: 0.6,
    lineageRefs: [sourceId],
    snapshotRefs: [sourceId],
    createdAt: now,
    updatedAt: now,
  }
}

export async function hydrateRuntime(workspaceId: string) {
  console.log('[runtimeHydration] starting, workspace:', workspaceId)

  const [durable, events] = await Promise.all([
    loadDurableContinuity(workspaceId),
    getAllReplayEventsForWorkspace(workspaceId),
  ])

  const checkpoint = selectBestReplayCheckpoint(durable.snapshots)
  const replay = reconstructOperationalStateFromReplay(events)

  if (replay.replayedEventCount > 0 && replay.lastReplaySequence !== checkpoint?.latestReplaySequence) {
    const threadId = replay.state.activeThreads[0] ?? 'runtime-replay'
    const nextCheckpoint = createReplayCheckpointSnapshot({
      workspaceId,
      threadId,
      state: replay.state,
      events,
    })

    void persistSnapshot(workspaceId, nextCheckpoint, snapshotProvenance(nextCheckpoint.id)).catch((err) => {
      console.error('[runtimeHydration] replay checkpoint persistence failed:', String(err))
    })
  }

  console.log('[runtimeHydration] complete', {
    activeProjects: replay.state.activeProjects.length,
    entities: replay.state.activeEntities.length,
    durableArtifacts: durable.artifacts.length,
    replayedEventCount: replay.replayedEventCount,
    lastReplaySequence: replay.lastReplaySequence ?? null,
  })

  return buildHydratedRuntimeState({
    durable,
    replay,
  })
}
