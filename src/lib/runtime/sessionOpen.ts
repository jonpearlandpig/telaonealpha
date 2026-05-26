import type { ContinuitySnapshot } from './continuitySnapshots'
import { buildOperationalState } from './operationalState'
import { buildAttentionQueue } from './attentionEngine'
import { detectOperationalChanges } from './changeDetection'
import { generateOperationalDigest } from './operationalDigest'

let previousState: ReturnType<typeof buildOperationalState> | null = null

export function restoreOnSessionOpen(threadId = 'chat-main'): {
  snapshot: ContinuitySnapshot | null
  state: ReturnType<typeof buildOperationalState>
  attention: ReturnType<typeof buildAttentionQueue>
  changes: ReturnType<typeof detectOperationalChanges>
  digest: ReturnType<typeof generateOperationalDigest>
} {
  const snapshot: ContinuitySnapshot | null = null
  const state = buildOperationalState([], [], threadId)
  const attention = buildAttentionQueue(state)
  const changes = detectOperationalChanges(previousState, state)
  const digest = generateOperationalDigest(state, attention, changes)
  previousState = state
  return { snapshot, state, attention, changes, digest }
}
