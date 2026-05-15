import type { EntityRecord } from '@/lib/entities/entityEngine'
import { upsertEntityRow, listWorkspaceEntities } from '@/lib/supabase/queries'
import type { ProvenanceMetadata } from '@/lib/supabase/schema'

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

export function loadPersistedEntities(workspaceId: string) { return listWorkspaceEntities(workspaceId) }
