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
  snapshotKind: 'acceleration' | 'checkpoint'
  replaySource: 'runtime_events'
  threadRefs: string[]
  entityRefs: string[]
  lineageRefs: string[]
  unresolvedCount: number
  replayedEventCount: number
  latestReplaySequence?: number
  latestEventId?: string
  latestEventAt?: string
  createdAt: string
  updatedAt: string
  provenance: ProvenanceMetadata
}

export type RuntimeEventSource = 'user' | 'system' | 'operator' | 'automation'

export type RuntimeEventRow = {
  id: string
  workspaceId: string
  replaySequence?: number
  type: string
  eventVersion: number
  schemaVersion: string
  source: RuntimeEventSource
  governanceState: string
  executionState: string
  traceId?: string
  correlationId?: string
  lineageId?: string
  payloadType?: string
  payload?: Record<string, unknown>
  createdAt: string
}

export type OperationalObjectRow = {
  id: string
  objectType: string
  lineageId?: string
  status: string
  payload: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export type RoutingPlanRow = {
  id: string
  action: string
  governanceState: string
  selectedOperators: string[]
  sequence: Record<string, unknown>[]
  rollbackClass: string
  escalationPath: string[]
  createdAt: string
}

export type EnforcementActionRow = {
  id: string
  eventId?: string
  action: string
  decision: string
  reason?: string
  createdAt: string
}

export type LineageGraphRow = {
  id: string
  lineageId: string
  parentLineageId?: string
  eventId?: string
  relationType: string
  createdAt: string
}

export type OperationalStateRow = {
  stateId: string
  workspaceId: string
  showId: string
  entityId: string
  entityType: string
  entityName: string
  stateCode: string
  stateLabel: string
  stateEmoji?: string
  severity: string
  lifecycleState: string
  triggerDetail: string
  resolutionAction?: string
  resolutionOwner?: string
  dependencyIds: string[]
  dependencyChain: string[]
  reasoningChain: string[]
  derivationSource?: string
  isActive: boolean
  stateEnteredAt: string
  stateUpdatedAt: string
  derivationVersion: string
  derivedAt: string
  explanation?: string
  sourceEventIds: string[]
  traceId?: string
  projectionVersion: string
  lineageIds: string[]
}
