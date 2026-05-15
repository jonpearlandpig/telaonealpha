import type { OperationalState } from './operationalState'

export type OperationalChange = { type: string; summary: string }

export function detectOperationalChanges(prev: OperationalState | null, next: OperationalState): OperationalChange[] {
  if (!prev) return [{ type: 'initial', summary: 'Operational continuity initialized.' }]
  const changes: OperationalChange[] = []
  const newlyUnresolved = next.unresolvedContinuity.filter((id) => !prev.unresolvedContinuity.includes(id))
  if (newlyUnresolved.length) changes.push({ type: 'unresolved', summary: `${newlyUnresolved.length} new unresolved continuity items surfaced.` })
  if (next.activeEntities[0] !== prev.activeEntities[0]) changes.push({ type: 'entity-shift', summary: 'Active entity focus shifted.' })
  if (next.currentPriorities[0]?.id !== prev.currentPriorities[0]?.id) changes.push({ type: 'priority-move', summary: 'Operational top priority changed.' })
  if (!changes.length) changes.push({ type: 'stable', summary: 'Operational continuity remained stable.' })
  return changes
}
