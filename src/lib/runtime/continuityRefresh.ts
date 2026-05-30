import type { ArtifactRecord } from '@/lib/artifacts/artifactStore'
import type { EntityRecord } from '@/lib/entities/entityEngine'
import { retrieveOperationalContinuity } from './continuityRetrieval'
import { createContinuitySnapshot } from './continuitySnapshots'

export function refreshContinuityState(threadId: string, artifacts: ArtifactRecord[], entities: EntityRecord[]) {
  const continuity = retrieveOperationalContinuity({ prompt: 'refresh', currentThreadId: threadId, artifacts, entities })
  const snapshot = createContinuitySnapshot({ threadId, artifacts, entities, continuity })
  return { continuity, snapshot }
}
