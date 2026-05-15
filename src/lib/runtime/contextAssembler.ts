import type { ArtifactRecord } from '@/lib/artifacts/artifactStore'
import type { EntityRecord } from '@/lib/entities/entityEngine'
import type { ContinuitySnapshot } from './continuitySnapshots'

export type AssembledOperationalContext = {
  artifacts: ArtifactRecord[]
  entities: EntityRecord[]
  snapshots: ContinuitySnapshot[]
  unresolved: ArtifactRecord[]
  threads: string[]
  lineage: string[]
  explanation: string[]
  assembledAt: string
}

export function assembleOperationalContext(input: {
  artifacts: ArtifactRecord[]
  entities: EntityRecord[]
  snapshots: ContinuitySnapshot[]
  unresolved: ArtifactRecord[]
}): AssembledOperationalContext {
  const threads = Array.from(new Set(input.artifacts.map((a) => a.threadId)))
  const lineage = Array.from(new Set(input.artifacts.map((a) => a.lineageId).filter(Boolean) as string[]))
  return {
    artifacts: input.artifacts,
    entities: input.entities,
    snapshots: input.snapshots,
    unresolved: input.unresolved,
    threads,
    lineage,
    explanation: [
      'Continuity-first retrieval applied',
      'Unresolved operational context prioritized',
      'Entity and provenance signals preserved',
    ],
    assembledAt: new Date().toISOString(),
  }
}
