import type { ArtifactRecord } from '@/lib/artifacts/artifactStore'
import type { EntityRecord } from '@/lib/entities/entityEngine'
import type { ContinuitySnapshot } from './continuitySnapshots'
import { assertWorkspace } from './workspaceIsolation'
import { persistArtifact, loadPersistedArtifacts } from './continuityPersistence'
import { persistEntity, loadPersistedEntities } from './entityPersistence'
import { persistSnapshot, loadPersistedSnapshots } from './snapshotPersistence'
import type { ProvenanceMetadata } from '@/lib/supabase/schema'

function baseProvenance(sourceId: string): ProvenanceMetadata {
  const now = new Date().toISOString()
  return { sourceType: 'runtime', sourceId, truthRank: 0.8, lineageRefs: [sourceId], createdAt: now, updatedAt: now }
}

export function persistDurableContinuity(workspaceId: string, input: { artifacts: ArtifactRecord[]; entities: EntityRecord[]; snapshots: ContinuitySnapshot[] }) {
  const ws = assertWorkspace(workspaceId)
  input.artifacts.forEach((a) => persistArtifact(ws, a, baseProvenance(a.id)))
  input.entities.forEach((e) => persistEntity(ws, e, baseProvenance(e.id)))
  input.snapshots.forEach((s) => persistSnapshot(ws, s, baseProvenance(s.id)))
}

export function loadDurableContinuity(workspaceId: string) {
  const ws = assertWorkspace(workspaceId)
  return { artifacts: loadPersistedArtifacts(ws), entities: loadPersistedEntities(ws), snapshots: loadPersistedSnapshots(ws) }
}
