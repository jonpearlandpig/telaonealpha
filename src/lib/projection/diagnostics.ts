import type { ShowTelaHomeData } from '@/lib/showtela/types'
import type { OperationalProjection, ProjectionDiagnostic } from './types'
import { detectCallSheetIssued, detectRiderAccepted, detectRosterLocked } from './projectionBuilder'

export function buildProjectionDiagnostic(
  homeData: ShowTelaHomeData,
  projection: OperationalProjection,
): ProjectionDiagnostic {
  const knownSignals: string[] = []
  const unknownSignals: string[] = []

  function check(signal: string, known: boolean) {
    if (known) knownSignals.push(signal)
    else unknownSignals.push(signal)
  }

  check('rider-accepted', detectRiderAccepted(homeData))
  check('call-sheet-issued', detectCallSheetIssued(homeData))
  check('roster-locked', detectRosterLocked(homeData))

  if (projection.nextShow != null) {
    knownSignals.push('next-show')
    check('show-venue', projection.nextShow.venue !== 'unknown')
    check('show-date', projection.nextShow.date !== 'unknown')
    check('show-city', projection.nextShow.city !== 'unknown')
  } else {
    unknownSignals.push('next-show', 'show-venue', 'show-date', 'show-city')
  }

  const total = knownSignals.length + unknownSignals.length
  const confidence: ProjectionDiagnostic['confidence'] =
    total === 0 || knownSignals.length === 0 ? 'none' :
    unknownSignals.length === 0 ? 'full' :
    'partial'

  return {
    dataSource: homeData.source ?? 'unknown',
    activeBlockerCount: projection.activeBlockers.length,
    knownSignals,
    unknownSignals,
    confidence,
    readinessScore: projection.readinessScore,
    openPressure: projection.openPressure,
    generatedAt: new Date().toISOString(),
  }
}
