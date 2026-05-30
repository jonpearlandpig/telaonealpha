import type { OperationalProjection } from '@/lib/runtime/state/model'
import type { FocusDiagnostic, FocusItem } from './types'

export function buildFocusDiagnostics(
  projection: OperationalProjection,
  focusItems: FocusItem[],
): FocusDiagnostic {
  const knownSignals: string[] = []
  const unknownSignals: string[] = []

  if (projection.blockers.length > 0) {
    knownSignals.push(`${projection.blockers.length} blocker(s) surfaced from operational projection`)
  }
  if (projection.escalations.length > 0) {
    knownSignals.push(`${projection.escalations.length} escalation(s) in active projection`)
  }
  const criticalCount = projection.groupedTopology.critical
  const highCount = projection.groupedTopology.high
  if (criticalCount > 0) {
    knownSignals.push(`${criticalCount} critical-severity state(s) present`)
  }
  if (highCount > 0) {
    knownSignals.push(`${highCount} high-severity state(s) present`)
  }
  if (projection.derivedFromEventCount > 0) {
    knownSignals.push(`Projection derived from ${projection.derivedFromEventCount} runtime event(s)`)
  }

  if (projection.blockers.length === 0 && projection.states.length === 0) {
    unknownSignals.push('No operational states are present in current projection')
  }
  if (focusItems.length === 0 && projection.states.length > 0) {
    unknownSignals.push('Operational states exist but none meet focus threshold — field may be calm')
  }
  if (projection.derivedFromEventCount === 0) {
    unknownSignals.push('Projection has no replay events — state may not reflect current reality')
  }

  const confidence =
    focusItems.length === 0
      ? 'none'
      : focusItems.length === 1
        ? 'partial'
        : 'full'

  return { knownSignals, unknownSignals, confidence }
}
