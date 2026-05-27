import type { RuntimeEvent } from '../runtimeTypes'
import { buildConstitutionalHealth } from './constitutionalHealth'
import { buildEscalationHealth } from './escalationHealth'
import { buildGovernanceHealth } from './governanceHealth'
import { buildReplayHealth } from './replayHealth'
import { buildRuntimeHealth } from './runtimeHealth'
import { buildStabilityHealth } from './stabilityHealth'

export function inspectObservabilityTopology(input: {
  workspaceId: string
  events: RuntimeEvent[]
}) {
  const runtime = buildRuntimeHealth(input)
  const governance = buildGovernanceHealth(input.events)
  const constitutional = buildConstitutionalHealth(input.events)
  const replay = buildReplayHealth(input)
  const escalation = buildEscalationHealth(input.events)
  const stability = buildStabilityHealth(input.events)

  return {
    whatFailed: [
      ...governance.legalityFailures,
      ...runtime.unresolvedTruthfulGaps,
      ...replay.replaySafeDiagnostics.failedConvergenceObjectIds,
    ],
    whyItFailed: [
      ...governance.legalityFailures,
      ...stability.suppressedInvocations.map((item) => item.reason),
    ],
    whatBlocked: governance.blocks,
    whatEscalated: escalation.escalationFrequency,
    whatCooledDown: stability.activeCooldowns.map((cooldown) => cooldown.subjectId),
    whatDrifted: replay.replaySafeDiagnostics.failedConvergenceObjectIds,
    whatRemainedDeterministic: {
      replay: replay.deterministicRestoration,
      constitutionalOrdering: constitutional.constitutionalOrderingIntegrity,
      runtimeAuthoritySource: runtime.runtimeAuthoritySource,
    },
  }
}
