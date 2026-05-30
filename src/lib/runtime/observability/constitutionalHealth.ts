import type { RuntimeEvent } from '../runtimeTypes'
import { buildConstitutionalObservability } from '@/lib/constitutional/runtime/constitutionalObservability'
import { constitutionalExecutesBeforeOperators } from '@/lib/constitutional/runtime/constitutionalOrdering'

export function buildConstitutionalHealth(events: RuntimeEvent[]) {
  const observability = buildConstitutionalObservability(events)
  const lifecycleTypes = events
    .filter((event) => event.type.startsWith('constitutional.') || event.type.startsWith('operator.'))
    .sort((left, right) => (left.replaySequence ?? 0) - (right.replaySequence ?? 0))
    .map((event) => event.type)

  return {
    constitutionalInvocationCounts: observability.executionCounts,
    legitimacyConfirmations: observability.legitimacyConfirmations,
    legitimacyFailures: observability.governanceFailures,
    auditTraces: observability.auditTraces,
    escalationCounts: observability.escalationPaths.length,
    constitutionalOrderingIntegrity: constitutionalExecutesBeforeOperators(lifecycleTypes),
    legalityState: observability.legalityState,
  }
}
