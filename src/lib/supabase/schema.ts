export type ProvenanceMetadata = {
  sourceType: string
  sourceId: string
  sourceUrl?: string
  truthRank: number
  authorityLevel?: string
  lineageRefs: string[]
  artifactGroupId?: string
  snapshotRefs?: string[]
  createdAt: string
  updatedAt: string
}

export type DurableArtifactRow = {
  id: string
  workspaceId: string
  threadId: string
  fileName?: string
  mimeType?: string
  lineageId?: string
  artifactGroupId?: string
  payload?: string
  createdAt: string
  updatedAt: string
  provenance: ProvenanceMetadata
}

export type DurableEntityRow = {
  id: string
  workspaceId: string
  name: string
  type: string
  continuityCount: number
  unresolvedLinks: number
  relatedArtifacts: string[]
  relatedThreads: string[]
  temporalClusters: string[]
  createdAt: string
  updatedAt: string
  provenance: ProvenanceMetadata
}

export type DurableSnapshotRow = {
  id: string
  workspaceId: string
  threadRefs: string[]
  entityRefs: string[]
  lineageRefs: string[]
  unresolvedCount: number
  createdAt: string
  updatedAt: string
  provenance: ProvenanceMetadata
}
