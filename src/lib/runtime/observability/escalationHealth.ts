import type { RuntimeEvent } from '../runtimeTypes'
import { reconstructEscalationTraces } from '../trace/escalationTrace'
import { deriveEscalationControls } from '../stability/escalationControls'

export function buildEscalationHealth(events: RuntimeEvent[]) {
  const traces = reconstructEscalationTraces(events)
  const controls = deriveEscalationControls(events)

  return {
    escalationFrequency: traces.length,
    escalationPaths: traces.map((trace) => trace.escalationDestination),
    escalationCeilings: traces.map((trace) => trace.escalationDestination.length),
    escalationContainment: controls.filter((control) => control.active).length,
    escalationSuppression: controls.filter((control) => control.active).map((control) => ({
      escalationId: control.escalationId,
      delayedUntil: control.delayedUntil,
      reason: control.reason,
    })),
  }
}
