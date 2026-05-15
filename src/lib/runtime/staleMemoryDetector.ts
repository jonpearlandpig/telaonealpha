import type { ArtifactRecord } from '@/lib/artifacts/artifactStore'
import { freshnessScore } from './freshnessLifecycle'

export function detectStaleMemories(artifacts: ArtifactRecord[], threshold = 10): ArtifactRecord[] {
  return artifacts.filter((a) => freshnessScore(a) < threshold)
}
