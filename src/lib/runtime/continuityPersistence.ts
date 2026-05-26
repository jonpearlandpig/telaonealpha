import type { ArtifactRecord } from '@/lib/artifacts/artifactStore'
import { upsertArtifactRow, listWorkspaceArtifacts } from '@/lib/supabase/queries'
import type { DurableArtifactRow, ProvenanceMetadata } from '@/lib/supabase/schema'

export function persistArtifact(workspaceId: string, artifact: ArtifactRecord, provenance: ProvenanceMetadata) {
  return upsertArtifactRow({
    id: artifact.id,
    workspaceId,
    threadId: artifact.threadId,
    fileName: artifact.fileName,
    mimeType: artifact.mimeType,
    lineageId: artifact.lineageId,
    artifactGroupId: artifact.artifactGroupId,
    payload: JSON.stringify(artifact),
    createdAt: artifact.createdAt,
    updatedAt: new Date().toISOString(),
    provenance,
  })
}

function toArtifactRecord(row: DurableArtifactRow): ArtifactRecord {
  if (row.payload) {
    try {
      return JSON.parse(row.payload) as ArtifactRecord
    } catch {
      // Fall through to minimal reconstruction.
    }
  }

  return {
    id: row.id,
    title: row.fileName ?? row.id,
    threadId: row.threadId,
    sessionId: row.artifactGroupId ?? 'durable-runtime',
    fileName: row.fileName,
    mimeType: row.mimeType,
    lineageId: row.lineageId,
    artifactGroupId: row.artifactGroupId,
    text: row.payload,
    createdAt: row.createdAt,
  }
}

export async function loadPersistedArtifacts(workspaceId: string) {
  const rows = await listWorkspaceArtifacts(workspaceId)
  return rows.map(toArtifactRecord)
}
