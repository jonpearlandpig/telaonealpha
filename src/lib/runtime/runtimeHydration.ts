import { createReplayCheckpointSnapshot, selectBestReplayCheckpoint } from './continuitySnapshots'
import { loadDurableContinuity } from './durableMemory'
import { getAllReplayEventsForWorkspace } from './eventStore'
import { deriveOperationalObjects } from './replay/derivedArtifacts'
import { verifyReplayConvergence } from './replay/replayConvergence'
import { reconstructOperationalStateFromReplay } from './replay/reconstructOperationalState'
import { persistSnapshot } from './snapshotPersistence'
import { buildHydratedRuntimeState } from './runtimeHydrationModel'
import type { RuntimeDiagnostics } from './runtimeHydrationModel'
import { buildOperationalProjectionFromEvents } from './state/buildOperationalProjection'
import { persistCanonicalObjectsFromReplay } from './objects/objectPersistenceWiring'
import type { RuntimeEvent } from './runtimeTypes'

function buildDiagnostics(
  workspaceId: string,
  events: RuntimeEvent[],
  replay: ReturnType<typeof reconstructOperationalStateFromReplay>,
  hasProjection: boolean,
): RuntimeDiagnostics {
  // One pass over all events to count objects by confirmation status.
  // An object ID is "confirmed" if at least one approved-state event produced it.
  const confirmedIds = new Set<string>()
  const allIds = new Set<string>()
  for (const event of events) {
    for (const obj of deriveOperationalObjects(event)) {
      allIds.add(obj.id)
      if (event.governanceState === 'approved') confirmedIds.add(obj.id)
    }
  }

  const convergence = verifyReplayConvergence({
    workspaceId,
    events,
  })

  return {
    runtimeAuthoritySource: 'hydrateRuntime',
    projectionBuiltFrom: hasProjection ? 'events' : 'none',
    hydrationReplaySequence: replay.lastReplaySequence,
    objectConfirmationCount: confirmedIds.size,
    unconfirmedObjectCount: allIds.size - confirmedIds.size,
    replayChecksum: convergence.replayChecksum,
    restorationChecksum: convergence.restorationChecksum,
    replayConverged: convergence.replayConverged,
    hydrationPassCount: convergence.hydrationPassCount,
    replayDriftDetected: convergence.replayDriftDetected,
    deterministicRestoration: convergence.deterministicRestoration,
    reconciliationConflictCount: convergence.reconciliationConflictCount,
    graphAssemblyAgeMs: undefined,
    hydratedAt: new Date().toISOString(),
  }
}

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

  // Additive: promote replay-derived objects to canonical form and persist.
  // Runs fire-and-forget — does not block hydration return.
  void persistCanonicalObjectsFromReplay(workspaceId, events).catch((err) => {
    console.error('[runtimeHydration] canonical object persistence failed:', String(err))
  })

  const operationalProjection = buildOperationalProjectionFromEvents({
    workspaceId,
    replayEvents: events,
    recentEvents: events.slice(-20),
  })

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

  const diagnostics = buildDiagnostics(workspaceId, events, replay, true)

  console.log('[runtimeHydration] diagnostics', {
    authoritySource: diagnostics.runtimeAuthoritySource,
    replaySequence: diagnostics.hydrationReplaySequence,
    confirmedObjects: diagnostics.objectConfirmationCount,
    unconfirmedObjects: diagnostics.unconfirmedObjectCount,
    replayChecksum: diagnostics.replayChecksum,
    restorationChecksum: diagnostics.restorationChecksum,
    replayConverged: diagnostics.replayConverged,
    replayDriftDetected: diagnostics.replayDriftDetected,
    projectionFrom: diagnostics.projectionBuiltFrom,
  })

  return buildHydratedRuntimeState({
    durable,
    replay,
    events,
    operationalProjection,
    diagnostics,
  })
}
