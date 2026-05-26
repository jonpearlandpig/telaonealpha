import type { EntityRecord } from '@/lib/entities/entityEngine'
import { upsertEntityRow, listWorkspaceEntities } from '@/lib/supabase/queries'
import type { DurableEntityRow, ProvenanceMetadata } from '@/lib/supabase/schema'

export function persistEntity(workspaceId: string, entity: EntityRecord, provenance: ProvenanceMetadata) {
  return upsertEntityRow({
    id: entity.id,
    workspaceId,
    name: entity.name,
    type: entity.type,
    continuityCount: entity.continuityCount,
    unresolvedLinks: entity.unresolvedLinks,
    relatedArtifacts: entity.relatedArtifacts,
    relatedThreads: entity.relatedThreads,
    temporalClusters: entity.temporalClusters,
    createdAt: entity.firstSeen,
    updatedAt: entity.lastSeen,
    provenance,
  })
}

function toEntityRecord(row: DurableEntityRow): EntityRecord {
  return {
    id: row.id,
    name: row.name,
    type: row.type as EntityRecord['type'],
    aliases: [],
    firstSeen: row.createdAt,
    lastSeen: row.updatedAt,
    linkedArtifacts: row.relatedArtifacts,
    linkedThreads: row.relatedThreads,
    operationalContexts: row.temporalClusters,
    continuityCount: row.continuityCount,
    unresolvedLinks: row.unresolvedLinks,
    relatedArtifacts: row.relatedArtifacts,
    relatedThreads: row.relatedThreads,
    temporalClusters: row.temporalClusters,
  }
}

export async function loadPersistedEntities(workspaceId: string) {
  const rows = await listWorkspaceEntities(workspaceId)
  return rows.map(toEntityRecord)
}
