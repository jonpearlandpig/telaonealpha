import type { RuntimeEvent } from '../runtimeTypes'
import { buildStabilityObservability } from '../stability/stabilityObservability'

export function buildStabilityHealth(events: RuntimeEvent[]) {
  const output = buildStabilityObservability({ events })

  return {
    activeCooldowns: output.activeCooldowns,
    suppressedInvocations: output.suppressedInvocations,
    pacingState: output.invocationPacing,
    invocationStormsPrevented: output.suppressedInvocations.length,
    constitutionalExemptions: output.activeCooldowns.filter((cooldown) => cooldown.constitutionalExempt).length,
    governanceStabilityMetrics: output.governanceStabilityMetrics,
  }
}
