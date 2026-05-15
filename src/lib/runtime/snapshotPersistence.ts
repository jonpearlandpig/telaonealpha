import type { ContinuitySnapshot } from './continuitySnapshots'
import { upsertSnapshotRow, listWorkspaceSnapshots } from '@/lib/supabase/queries'
import type { ProvenanceMetadata } from '@/lib/supabase/schema'

export function persistSnapshot(workspaceId: string, snapshot: ContinuitySnapshot, provenance: ProvenanceMetadata) {
  return upsertSnapshotRow({
    id: snapshot.id,
    workspaceId,
    threadRefs: snapshot.threadRefs,
    entityRefs: snapshot.entityRefs,
    lineageRefs: snapshot.lineageRefs,
    unresolvedCount: snapshot.continuityMetadata.unresolvedCount,
    createdAt: snapshot.createdAt,
    updatedAt: new Date().toISOString(),
    provenance,
  })
}

export function loadPersistedSnapshots(workspaceId: string) { return listWorkspaceSnapshots(workspaceId) }
