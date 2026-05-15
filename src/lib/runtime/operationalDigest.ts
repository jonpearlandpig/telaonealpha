import type { AttentionItem } from './attentionEngine'
import type { OperationalChange } from './changeDetection'
import type { OperationalState } from './operationalState'

export type OperationalDigest = {
  whatChanged: string
  unresolved: string
  needsAttention: string
  resurfacing: string
  activeContinuity: string
}

export function generateOperationalDigest(state: OperationalState, attention: AttentionItem[], changes: OperationalChange[]): OperationalDigest {
  return {
    whatChanged: changes[0]?.summary ?? 'No meaningful change detected.',
    unresolved: `${state.unresolvedContinuity.length} unresolved continuity items remain active.`,
    needsAttention: attention[0] ? `Top attention: ${attention[0].whyNow}.` : 'No urgent operational attention required.',
    resurfacing: state.staleImportantMemory.length ? `${state.staleImportantMemory.length} dormant but important continuity items resurfaced.` : 'No dormant continuity resurfacing.',
    activeContinuity: `${state.activeThreads.length} active threads across ${state.activeEntities.length} active entities.`,
  }
}
