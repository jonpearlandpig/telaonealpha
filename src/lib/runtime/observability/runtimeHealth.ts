import type { RuntimeEvent } from '../runtimeTypes'
import { buildCanonicalObjectsFromReplay } from '../objects/objectReplayPromotion'
import { inspectReplayConvergence } from '../replay/convergenceInspection'
import { verifyReplayConvergence } from '../replay/replayConvergence'
import { reconstructOperationalStateFromReplay } from '../replay/reconstructOperationalState'

export function buildRuntimeHealth(input: {
  workspaceId: string
  events: RuntimeEvent[]
}) {
  const convergence = verifyReplayConvergence({
    workspaceId: input.workspaceId,
    events: input.events,
  })
  const inspection = inspectReplayConvergence({
    workspaceId: input.workspaceId,
    events: input.events,
  })
  const canonicalObjects = buildCanonicalObjectsFromReplay(input.workspaceId, input.events)
  const replayState = reconstructOperationalStateFromReplay(input.events)

  return {
    replayConvergence: convergence.replayConverged,
    replayDrift: convergence.replayDriftDetected,
    runtimeAuthoritySource: 'replay-reconstruction',
    replayChecksum: convergence.replayChecksum,
    restorationChecksum: convergence.restorationChecksum,
    objectConfirmationCounts: {
      canonical: convergence.secondSnapshot.canonicalObjectCount,
      confirmed: convergence.secondSnapshot.confirmedObjectCount,
      unresolved: convergence.secondSnapshot.unresolvedObjectCount,
    },
    unresolvedTruthfulGaps: inspection.unresolvedGapObjectIds,
    truthfulGapCount: inspection.unresolvedGapObjectIds.length,
    replayedEventCount: replayState.replayedEventCount,
    activeUnresolvedContinuity: replayState.state.unresolvedContinuity,
    deterministicRestoration: convergence.deterministicRestoration,
    canonicalObjectIds: canonicalObjects.map((object) => object.id).slice(0, 20),
  }
}
