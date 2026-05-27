import type { RuntimeEvent } from '../runtimeTypes'
import { buildTraceObservability } from '../trace/traceObservability'

export function buildOrchestrationHealth(input: {
  workspaceId: string
  events: RuntimeEvent[]
}) {
  const trace = buildTraceObservability({
    workspaceId: input.workspaceId,
    events: input.events,
  })

  return {
    invocationCounts: trace.invocationCounts,
    blockedExecutions: trace.blockedExecutions,
    executionApprovals: input.events.filter((event) => event.type === 'operator.execution.approved').length,
    executionCompletions: input.events.filter((event) => event.type === 'operator.execution.completed').length,
    recommendationGeneration: input.events.filter((event) => event.type === 'operator.recommendation.generated').length,
    routingFrequency: trace.routingFrequencies,
    traceReconstructionIntegrity: trace.replayReconstructionHealth.deterministicRestoration,
  }
}
