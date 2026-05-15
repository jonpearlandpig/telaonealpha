import type { OperationalState } from './operationalState'

export type AttentionItem = { id: string; whyNow: string; unresolved: boolean; lineageDepth: number; continuityIntensity: number; relatedThreads: string[]; linkedEntities: string[] }

export function buildAttentionQueue(state: OperationalState): AttentionItem[] {
  return state.currentPriorities.map((p) => ({
    id: p.id,
    whyNow: p.reason,
    unresolved: state.unresolvedContinuity.includes(p.id),
    lineageDepth: state.recentLineage.length,
    continuityIntensity: state.continuityIntensity,
    relatedThreads: state.activeThreads.slice(0, 4),
    linkedEntities: state.activeEntities.slice(0, 4),
  })).sort((a, b) => Number(b.unresolved) - Number(a.unresolved))
}
