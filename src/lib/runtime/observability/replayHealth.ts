import type { RuntimeEvent } from '../runtimeTypes'
import { inspectReplayConvergence } from '../replay/convergenceInspection'
import { verifyReplayConvergence } from '../replay/replayConvergence'

export function buildReplayHealth(input: {
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

  return {
    replayConvergence: convergence.replayConverged,
    replayDrift: convergence.replayDriftDetected,
    deterministicRestoration: convergence.deterministicRestoration,
    replaySequenceIntegrity: convergence.secondSnapshot.replaySequenceRange,
    reconstructionTiming: {
      hydrationPassCount: convergence.hydrationPassCount,
      assembledAt: convergence.secondSnapshot.restoredAt,
    },
    replaySafeDiagnostics: {
      failedConvergenceObjectIds: inspection.failedConvergenceObjectIds,
      divergedLineageIds: inspection.divergedLineageIds,
      driftReplaySequences: inspection.driftReplaySequences,
      reconciliationSplitObjectIds: inspection.reconciliationSplitObjectIds,
    },
  }
}
