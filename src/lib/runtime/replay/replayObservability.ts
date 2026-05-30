import { verifyReplayConvergence } from './replayConvergence'

export type ReplayObservabilitySnapshot = {
  replayChecksum: string
  restorationChecksum: string
  replayConverged: boolean
  replayDriftDetected: boolean
  deterministicRestoration: boolean
  reconciliationConflictCount: number
  hydrationPassCount: number
  canonicalObjectCount: number
  confirmedObjectCount: number
  unresolvedObjectCount: number
  lineageChainCount: number
  ontologyVersion: string
  replaySequenceRange: {
    first: number | null
    last: number | null
  }
  assembledAt: string | null
}

export function createReplayObservabilitySnapshot(input: {
  workspaceId: string
  events: Parameters<typeof verifyReplayConvergence>[0]['events']
  hydrationPassCount?: number
}): ReplayObservabilitySnapshot {
  const convergence = verifyReplayConvergence({
    workspaceId: input.workspaceId,
    events: input.events,
    passCount: input.hydrationPassCount,
  })

  return {
    replayChecksum: convergence.replayChecksum,
    restorationChecksum: convergence.restorationChecksum,
    replayConverged: convergence.replayConverged,
    replayDriftDetected: convergence.replayDriftDetected,
    deterministicRestoration: convergence.deterministicRestoration,
    reconciliationConflictCount: convergence.reconciliationConflictCount,
    hydrationPassCount: convergence.hydrationPassCount,
    canonicalObjectCount: convergence.secondSnapshot.canonicalObjectCount,
    confirmedObjectCount: convergence.secondSnapshot.confirmedObjectCount,
    unresolvedObjectCount: convergence.secondSnapshot.unresolvedObjectCount,
    lineageChainCount: convergence.secondSnapshot.lineageChainCount,
    ontologyVersion: convergence.secondSnapshot.ontologyVersion,
    replaySequenceRange: convergence.secondSnapshot.replaySequenceRange,
    assembledAt: convergence.secondSnapshot.restoredAt,
  }
}
