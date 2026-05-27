import type { RuntimeEvent } from '../runtimeTypes'
import { reconstructGovernanceTraces } from '../trace/governanceTrace'

export function buildGovernanceHealth(events: RuntimeEvent[]) {
  const traces = reconstructGovernanceTraces(events)
  const approvals = traces.filter((trace) => trace.legalityDecision === 'approved')
  const blocks = traces.filter((trace) => trace.legalityDecision === 'blocked')
  const escalations = traces.filter((trace) => trace.escalationReasons.length > 0)

  return {
    approvals: approvals.length,
    blocks: blocks.length,
    escalations: escalations.length,
    legalityFailures: blocks.map((trace) => trace.rejections).flat(),
    governanceEventCounts: {
      validated: events.filter((event) => event.type === 'governance.validated' || event.type === 'operator.analysis.completed').length,
      blocked: events.filter((event) => event.type === 'governance.blocked' || event.type === 'operator.blocked').length,
      escalated: events.filter((event) => event.type === 'operator.escalated').length,
    },
    governanceStabilityState: blocks.length > 0 || escalations.length > 0 ? 'attention-required' : 'stable',
  }
}
