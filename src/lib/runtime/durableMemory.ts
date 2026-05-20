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

export async function persistDurableContinuity(workspaceId: string, input: { artifacts: ArtifactRecord[]; entities: EntityRecord[]; snapshots: ContinuitySnapshot[] }) {
  const ws = assertWorkspace(workspaceId)
  await Promise.all([
    ...input.artifacts.map((a) => persistArtifact(ws, a, baseProvenance(a.id))),
    ...input.entities.map((e) => persistEntity(ws, e, baseProvenance(e.id))),
    ...input.snapshots.map((s) => persistSnapshot(ws, s, baseProvenance(s.id))),
  ])
}

export async function loadDurableContinuity(workspaceId: string) {
  const ws = assertWorkspace(workspaceId)
  const [artifacts, entities, snapshots] = await Promise.all([
    loadPersistedArtifacts(ws),
    loadPersistedEntities(ws),
    loadPersistedSnapshots(ws),
  ])
  return { artifacts, entities, snapshots }
}
