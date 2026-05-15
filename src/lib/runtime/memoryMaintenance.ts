import type { ArtifactRecord } from '@/lib/artifacts/artifactStore'
import type { EntityRecord } from '@/lib/entities/entityEngine'
import { processIngestionTick } from './ingestionScheduler'
import { reconcileEntities } from './entityReconciliation'
import { detectStaleMemories } from './staleMemoryDetector'
import { refreshContinuityState } from './continuityRefresh'

export function runMemoryMaintenance(input: { threadId: string; artifacts: ArtifactRecord[]; entities: EntityRecord[] }) {
  processIngestionTick()
  const reconciled = reconcileEntities(input.entities)
  const stale = detectStaleMemories(input.artifacts)
  const refreshed = refreshContinuityState(input.threadId, input.artifacts, reconciled)
  return { reconciledEntities: reconciled, staleArtifacts: stale, continuity: refreshed.continuity, snapshot: refreshed.snapshot }
}
