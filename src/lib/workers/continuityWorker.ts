import { refreshContinuityState } from '@/lib/runtime/continuityRefresh'
import type { ArtifactRecord } from '@/lib/artifacts/artifactStore'
import type { EntityRecord } from '@/lib/entities/entityEngine'

export function runContinuityWorker(threadId: string, artifacts: ArtifactRecord[], entities: EntityRecord[]) {
  return refreshContinuityState(threadId, artifacts, entities)
}
