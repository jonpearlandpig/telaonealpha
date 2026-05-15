import type { ArtifactRecord } from '@/lib/artifacts/artifactStore'
import type { EntityRecord } from '@/lib/entities/entityEngine'
import { buildOperationalState } from './operationalState'
import { restoreOnSessionOpen } from './sessionOpen'

export type StressResult = {
  artifactCount: number
  lineageDepth: number
  unresolvedCount: number
  entityOverlap: number
  restoredPriorities: number
  notes: string[]
}

export function runContinuityStressTest(artifacts: ArtifactRecord[], entities: EntityRecord[]): StressResult {
  const sliced = artifacts.slice(0, 150)
  const state = buildOperationalState(sliced, entities, 'chat-main')
  const restored = restoreOnSessionOpen('chat-main')
  return {
    artifactCount: sliced.length,
    lineageDepth: state.recentLineage.length,
    unresolvedCount: state.unresolvedContinuity.length,
    entityOverlap: entities.reduce((s, e) => s + (e.relatedArtifacts?.length ?? 0), 0),
    restoredPriorities: restored.state.currentPriorities.length,
    notes: [
      'Stress test run with capped artifact window for mobile-safe validation.',
      state.unresolvedContinuity.length > 0 ? 'Unresolved continuity persisted under load.' : 'No unresolved continuity detected in sample.',
    ],
  }
}
