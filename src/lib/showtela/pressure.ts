import type { PressureLevel, UnresolvedObject } from './types'

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
