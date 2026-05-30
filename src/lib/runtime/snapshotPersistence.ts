import type { ContinuitySnapshot } from './continuitySnapshots'
import { upsertSnapshotRow, listWorkspaceSnapshots } from '@/lib/supabase/queries'
import type { DurableSnapshotRow, ProvenanceMetadata } from '@/lib/supabase/schema'

export function persistSnapshot(workspaceId: string, snapshot: ContinuitySnapshot, provenance: ProvenanceMetadata) {
  return upsertSnapshotRow({
    id: snapshot.id,
    workspaceId,
    snapshotKind: snapshot.snapshotKind ?? 'acceleration',
    replaySource: snapshot.replaySource ?? 'runtime_events',
    threadRefs: snapshot.threadRefs,
    entityRefs: snapshot.entityRefs,
    lineageRefs: snapshot.lineageRefs,
    unresolvedCount: snapshot.continuityMetadata.unresolvedCount,
    replayedEventCount: snapshot.replayedEventCount ?? 0,
    latestReplaySequence: snapshot.latestReplaySequence,
    latestEventId: snapshot.latestEventId,
    latestEventAt: snapshot.latestEventAt,
    createdAt: snapshot.createdAt,
    updatedAt: new Date().toISOString(),
    provenance,
  })
}

function toContinuitySnapshot(row: DurableSnapshotRow): ContinuitySnapshot {
  return {
    id: row.id,
    createdAt: row.createdAt,
    snapshotKind: row.snapshotKind,
    replaySource: row.replaySource,
    replayedEventCount: row.replayedEventCount,
    latestReplaySequence: row.latestReplaySequence,
    latestEventId: row.latestEventId,
    latestEventAt: row.latestEventAt,
    threadRefs: row.threadRefs,
    entityRefs: row.entityRefs,
    lineageRefs: row.lineageRefs,
    activeArtifacts: [],
    relatedEntities: [],
    unresolvedThreads: [],
    recentLineage: [],
    activeOperationalContexts: [],
    continuityMetadata: {
      unresolvedCount: row.unresolvedCount,
      pinnedCount: 0,
      provenanceCount: row.lineageRefs.length,
      temporalWeight: 0,
    },
  }
}

export async function loadPersistedSnapshots(workspaceId: string) {
  const rows = await listWorkspaceSnapshots(workspaceId)
  return rows.map(toContinuitySnapshot)
}
