import type { OperationalProjection } from '@/lib/runtime/state/model'
import type { ReplayDiagnostic, ReplayOutput } from './types'

export function buildReplayDiagnostics(
  replay: ReplayOutput,
  projection: OperationalProjection,
): ReplayDiagnostic {
  const knownSignals: string[] = []
  const unknownSignals: string[] = []

  if (replay.stepCount > 0) {
    knownSignals.push(`${replay.stepCount} continuity event(s) in replay timeline`)
  }

  const blockerSteps = replay.timeline.filter((s) => s.isBlocker).length
  const resolutionSteps = replay.timeline.filter((s) => s.isResolution).length
  const focusSteps = replay.timeline.filter((s) => s.isFocusRelated).length

  if (blockerSteps > 0) {
    knownSignals.push(`${blockerSteps} blocker event(s) identified in history`)
  }
  if (resolutionSteps > 0) {
    knownSignals.push(`${resolutionSteps} resolution event(s) identified in history`)
  }
  if (focusSteps > 0) {
    knownSignals.push(`${focusSteps} focus-relevant event(s) in timeline`)
  }
  if (replay.topFocus) {
    knownSignals.push(`Top focus: ${replay.topFocus.title} (priority ${replay.topFocus.priority})`)
  }
  if (projection.derivedFromEventCount > 0) {
    knownSignals.push(`Projection derived from ${projection.derivedFromEventCount} runtime event(s)`)
  }

  if (replay.stepCount === 0) {
    unknownSignals.push('No continuity events found — timeline is empty')
  }
  if (projection.derivedFromEventCount === 0) {
    unknownSignals.push('Projection has no replay events — historical state unclear')
  }
  if (!replay.topFocus) {
    unknownSignals.push('No focus item — field appears calm or evidence is insufficient')
  }

  const confidence =
    replay.stepCount === 0
      ? 'none'
      : replay.stepCount >= 10
        ? 'full'
        : 'partial'

  return { knownSignals, unknownSignals, confidence }
}
