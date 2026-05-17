import type { PressureLevel, UnresolvedObject } from './types'

type OperationalPressureInput = {
  unresolvedDependencyCount: number
  staleApprovals: number
  blockedOperationalObjects: number
  timelineRisks: number
  financingDelays: number
  staffingGaps: number
  assumptionsAwaitingValidation: number
  oldestUnresolvedAgeHours: number
}

export function calculatePressure(unresolved: UnresolvedObject[]): { score: number; level: PressureLevel } {
  const score = unresolved.reduce((acc, item) => {
    const severityWeight = item.severity === 'high' ? 3 : item.severity === 'medium' ? 2 : 1
    const agingWeight = item.aging ? Math.min(3, Math.floor(item.aging / 2) + 1) : 0
    const dependencyWeight = item.blocking ? 2 : 0
    return acc + 1 + severityWeight + agingWeight + dependencyWeight
  }, 0)

  const level: PressureLevel = score >= 12 ? 'high' : score >= 6 ? 'medium' : 'low'
  return { score, level }
}

export function computeOperationalPressure(input: OperationalPressureInput): { score: number; level: 'low' | 'elevated' | 'critical'; oldestUnresolvedAgeHours: number } {
  const score = input.unresolvedDependencyCount * 2 + input.staleApprovals + input.blockedOperationalObjects * 2 + input.timelineRisks * 2 + input.financingDelays * 2 + input.staffingGaps + input.assumptionsAwaitingValidation + Math.min(6, Math.floor(input.oldestUnresolvedAgeHours / 12))
  const level = score >= 22 ? 'critical' : score >= 11 ? 'elevated' : 'low'
  return { score, level, oldestUnresolvedAgeHours: input.oldestUnresolvedAgeHours }
}
