import { detectStaleMemories } from '@/lib/runtime/staleMemoryDetector'
import type { ArtifactRecord } from '@/lib/artifacts/artifactStore'

export function runFreshnessWorker(artifacts: ArtifactRecord[]) {
  return detectStaleMemories(artifacts)
}
