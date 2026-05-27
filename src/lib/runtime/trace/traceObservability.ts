import type { RuntimeEvent } from '../runtimeTypes'
import { createReplayObservabilitySnapshot } from '../replay/replayObservability'
import { reconstructConstitutionalTraces } from './constitutionalTrace'
import { reconstructEscalationTraces } from './escalationTrace'
import { reconstructGovernanceTraces } from './governanceTrace'
import { reconstructInvocationTraces } from './invocationTrace'
import { reconstructRoutingTraces } from './routingTrace'

export function buildTraceObservability(input: {
  workspaceId: string
  events: RuntimeEvent[]
}) {
  const routing = reconstructRoutingTraces(input.events)
  const invocations = reconstructInvocationTraces(input.events)
  const governance = reconstructGovernanceTraces(input.events)
  const constitutional = reconstructConstitutionalTraces(input.events)
  const escalations = reconstructEscalationTraces(input.events)
  const replayHealth = createReplayObservabilitySnapshot({
    workspaceId: input.workspaceId,
    events: input.events,
  })

  return {
    invocationCounts: invocations.length,
    governanceApprovals: governance.filter((trace) => trace.legalityDecision === 'approved').length,
    governanceFailures: governance.filter((trace) => trace.legalityDecision === 'blocked').length,
    constitutionalActivity: constitutional.length,
    escalationCounts: escalations.length,
    blockedExecutions: invocations.filter((trace) => trace.governanceApproval === 'blocked' || trace.constitutionalValidation === 'blocked').length,
    routingFrequencies: routing.reduce<Record<string, number>>((acc, trace) => {
      const key = trace.action ?? 'unknown'
      acc[key] = (acc[key] ?? 0) + 1
      return acc
    }, {}),
    replayReconstructionHealth: {
      replayConverged: replayHealth.replayConverged,
      deterministicRestoration: replayHealth.deterministicRestoration,
      replayDriftDetected: replayHealth.replayDriftDetected,
    },
  }
}
