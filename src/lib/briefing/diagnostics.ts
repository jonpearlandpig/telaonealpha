import type { OperationalProjection } from '@/lib/runtime/state/model'
import type { BriefingDiagnostic, OperationalBrief } from './types'

export function buildBriefingDiagnostics(
  brief: OperationalBrief,
  projection: OperationalProjection,
): BriefingDiagnostic {
  const knownSignals: string[] = []
  const unknownSignals: string[] = []

  if (brief.newEvents > 0) {
    knownSignals.push(`${brief.newEvents} new continuity event(s) detected`)
  }
  if (projection.blockers.length > 0) {
    knownSignals.push(`${projection.blockers.length} active blocker(s) in projection`)
  }
  if (brief.resolvedItems > 0) {
    knownSignals.push(`${brief.resolvedItems} resolved item(s) detected`)
  }
  if (brief.topFocus) {
    knownSignals.push(`Top focus: ${brief.topFocus.title} (priority ${brief.topFocus.priority})`)
  }
  if (projection.derivedFromEventCount > 0) {
    knownSignals.push(`Projection derived from ${projection.derivedFromEventCount} runtime event(s)`)
  }

  if (brief.newEvents === 0) {
    unknownSignals.push('No continuity events found — field may be empty or disconnected')
  }
  if (projection.derivedFromEventCount === 0) {
    unknownSignals.push('Projection has no replay events — state may not reflect current reality')
  }
  if (!brief.topFocus) {
    unknownSignals.push('No focus item identified — insufficient evidence to prioritize')
  }

  const hasFeed = brief.newEvents > 0
  const hasBlockers = projection.blockers.length > 0
  const confidence =
    knownSignals.length === 0
      ? 'none'
      : hasFeed && hasBlockers
        ? 'full'
        : 'partial'

  return { knownSignals, unknownSignals, confidence }
}
