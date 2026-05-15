import type { ArtifactRecord } from '@/lib/artifacts/artifactStore'
import { upsertArtifactRow, listWorkspaceArtifacts } from '@/lib/supabase/queries'
import type { ProvenanceMetadata } from '@/lib/supabase/schema'

export function persistArtifact(workspaceId: string, artifact: ArtifactRecord, provenance: ProvenanceMetadata) {
  return upsertArtifactRow({
    id: artifact.id,
    workspaceId,
    threadId: artifact.threadId,
    fileName: artifact.fileName,
    mimeType: artifact.mimeType,
    lineageId: artifact.lineageId,
    artifactGroupId: artifact.artifactGroupId,
    payload: artifact.html ?? artifact.markdown ?? artifact.code ?? artifact.text,
    createdAt: artifact.createdAt,
    updatedAt: new Date().toISOString(),
    provenance,
  })
}

export function loadPersistedArtifacts(workspaceId: string) { return listWorkspaceArtifacts(workspaceId) }
