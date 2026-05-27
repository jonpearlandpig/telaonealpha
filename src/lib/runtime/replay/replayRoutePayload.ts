import { inspectReplayConvergence } from './convergenceInspection'
import { createReplayObservabilitySnapshot } from './replayObservability'
import { detectReplayDrift } from './replayDrift'
import { verifyReplayConvergence } from './replayConvergence'
import type { RuntimeEvent } from '../runtimeTypes'

export function buildReplayRoutePayload(input: {
  workspaceId: string
  events: RuntimeEvent[]
}) {
  const convergence = verifyReplayConvergence({
    workspaceId: input.workspaceId,
    events: input.events,
  })
  const firstTelemetry = createReplayObservabilitySnapshot({
    workspaceId: input.workspaceId,
    events: input.events,
    hydrationPassCount: convergence.hydrationPassCount,
  })
  const secondTelemetry = createReplayObservabilitySnapshot({
    workspaceId: input.workspaceId,
    events: [...input.events],
    hydrationPassCount: convergence.hydrationPassCount,
  })
  const drift = detectReplayDrift({
    first: firstTelemetry,
    second: secondTelemetry,
    identityStable: convergence.identityStable,
    reconciliationStable: convergence.reconciliationStable,
    lineageStable: convergence.lineageStable,
    confirmationStable: convergence.confirmationStable,
  })
  const inspection = inspectReplayConvergence({
    workspaceId: input.workspaceId,
    events: input.events,
  })

  return {
    restorationTelemetry: secondTelemetry,
    convergenceState: {
      replayConverged: convergence.replayConverged,
      checksumEqual: convergence.checksumEqual,
      identityStable: convergence.identityStable,
      reconciliationStable: convergence.reconciliationStable,
      ontologyStable: convergence.ontologyStable,
      lineageStable: convergence.lineageStable,
      confirmationStable: convergence.confirmationStable,
    },
    replayDiagnostics: {
      replayDriftDetected: drift.replayDriftDetected,
      reasons: drift.reasons,
      inspection,
    },
    deterministicChecksumState: {
      replayChecksum: secondTelemetry.replayChecksum,
      restorationChecksum: secondTelemetry.restorationChecksum,
    },
    replayAuthorityMetadata: {
      authoritySource: 'replay-reconstruction',
      replaySource: 'runtime_events',
      routeMode: 'read-only',
      workspaceId: input.workspaceId,
      observedEventCount: input.events.length,
    },
  }
}
