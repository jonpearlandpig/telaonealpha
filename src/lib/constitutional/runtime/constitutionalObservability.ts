import type { RuntimeEvent } from '@/lib/runtime/runtimeTypes'
import type { ConstitutionalLifecycleEventType } from './constitutionalTypes'

const CONSTITUTIONAL_EVENT_TYPES = new Set<ConstitutionalLifecycleEventType>([
  'constitutional.invoked',
  'constitutional.validated',
  'constitutional.blocked',
  'constitutional.audit.logged',
  'constitutional.legitimacy.confirmed',
  'constitutional.escalated',
])

function isConstitutionalEvent(event: RuntimeEvent): boolean {
  return CONSTITUTIONAL_EVENT_TYPES.has(event.type as ConstitutionalLifecycleEventType)
}

export function buildConstitutionalObservability(events: RuntimeEvent[]) {
  const constitutionalEvents = events
    .filter(isConstitutionalEvent)
    .sort((left, right) => (left.replaySequence ?? 0) - (right.replaySequence ?? 0))
  const hasBlocked = constitutionalEvents.some((event) => event.type === 'constitutional.blocked')

  return {
    executionCounts: constitutionalEvents.reduce<Record<string, number>>((counts, event) => {
      counts[event.type] = (counts[event.type] ?? 0) + 1
      return counts
    }, {}),
    legitimacyConfirmations: constitutionalEvents.filter((event) => event.type === 'constitutional.legitimacy.confirmed').length,
    governanceFailures: constitutionalEvents.filter((event) => event.type === 'constitutional.blocked').length,
    escalationPaths: constitutionalEvents
      .filter((event) => event.type === 'constitutional.escalated')
      .map((event) => (event.payload as { constitutionalPath?: string[] } | undefined)?.constitutionalPath ?? []),
    auditTraces: constitutionalEvents
      .map((event) => (event.payload as { auditTrace?: Record<string, unknown> } | undefined)?.auditTrace)
      .filter((trace): trace is Record<string, unknown> => Boolean(trace)),
    legalityState: hasBlocked ? 'failed' : 'confirmed',
    constitutionalEvents,
  }
}
