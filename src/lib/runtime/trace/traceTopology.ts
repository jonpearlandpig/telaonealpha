import type { RuntimeEvent } from '../runtimeTypes'
import { reconstructConstitutionalTraces } from './constitutionalTrace'
import { reconstructEscalationTraces } from './escalationTrace'
import { reconstructGovernanceTraces } from './governanceTrace'
import { reconstructInvocationTraces } from './invocationTrace'
import { reconstructRoutingTraces } from './routingTrace'

export function inspectTraceTopology(events: RuntimeEvent[]) {
  const routing = reconstructRoutingTraces(events)
  const governance = reconstructGovernanceTraces(events)
  const constitutional = reconstructConstitutionalTraces(events)
  const escalations = reconstructEscalationTraces(events)
  const invocations = reconstructInvocationTraces(events)

  return {
    whatRouted: routing.map((trace) => ({ action: trace.action, routingId: trace.routingId, reason: trace.routingReason })),
    whyItRouted: routing.map((trace) => trace.routingReason),
    whatValidatedIt: governance.filter((trace) => trace.legalityDecision === 'approved').map((trace) => trace.sourceEventId),
    whatBlockedIt: [
      ...governance.filter((trace) => trace.legalityDecision === 'blocked').map((trace) => trace.sourceEventId),
      ...constitutional.filter((trace) => trace.legitimacyState === 'blocked').map((trace) => trace.sourceEventId),
    ],
    whatEscalated: escalations.map((trace) => ({ source: trace.escalationSource, destination: trace.escalationDestination })),
    whatCompleted: invocations.filter((trace) => trace.governanceApproval === 'approved' && trace.constitutionalValidation === 'confirmed').map((trace) => trace.invocationId),
    invocations,
  }
}
