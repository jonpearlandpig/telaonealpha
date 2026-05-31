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
      const parsed = JSON.parse(row.payload) as Partial<ArtifactRecord>
      if (!parsed.createdAt) {
        console.warn('[continuityPersistence] artifact payload missing createdAt; falling back to durable row', {
          id: row.id,
          title: parsed.title ?? row.fileName ?? row.id,
          rowCreatedAt: row.createdAt,
        })
      }

      return {
        id: parsed.id ?? row.id,
        title: parsed.title ?? row.fileName ?? row.id,
        threadId: parsed.threadId ?? row.threadId,
        sessionId: parsed.sessionId ?? row.artifactGroupId ?? 'durable-runtime',
        prompt: parsed.prompt,
        html: parsed.html,
        markdown: parsed.markdown,
        text: parsed.text ?? row.payload,
        fileName: parsed.fileName ?? row.fileName,
        mimeType: parsed.mimeType ?? row.mimeType,
        previewUrl: parsed.previewUrl,
        code: parsed.code,
        structure: parsed.structure,
        entities: parsed.entities,
        projects: parsed.projects,
        lineageId: parsed.lineageId ?? row.lineageId,
        artifactGroupId: parsed.artifactGroupId ?? row.artifactGroupId,
        createdAt: parsed.createdAt ?? row.createdAt,
        pinned: parsed.pinned,
        classification: parsed.classification,
      }
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
