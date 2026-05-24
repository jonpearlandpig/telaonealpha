export type PressureLevel = 'low' | 'medium' | 'high'

export type AuthorshipSurface = 'telegram' | 'voice' | 'ingest' | 'runtime' | 'notion' | 'api'

export type AuthorshipTrace = {
  author: string
  surface: AuthorshipSurface
  capturedAt: string
  modifiedBy?: string
  modifiedAt?: string
}

export type LineageRef = {
  lineageId: string
  parentId?: string
  chain: readonly string[]
  capturedAt: string
}

export type DataSource = 'supabase' | 'notion' | 'empty'

export type DiagnosticState =
  | 'persistence-connected'
  | 'persistence-stale'
  | 'persistence-failed'
  | 'notion-unavailable'

export type PersonEntity = {
  id: string
  name: string
  role?: string
  avatar?: string
  active?: boolean
  unresolvedCount?: number
  updatesCount?: number
  pressure?: PressureLevel
  partner?: boolean
}

export type OperationEntity = {
  id: string
  title: string
  status?: string
  unresolvedCount?: number
  latestMovement?: string
  pressure?: PressureLevel
}

export type ContinuityEvent = {
  id: string
  headline: string
  body?: string
  timestamp?: string
  image?: string
  tags?: string[]
  owner?: PersonEntity
  pressure?: PressureLevel
  threadId?: string
  isNew?: boolean
  waitingOn?: string
  blockedBy?: string
  approvalOwner?: string
  lastContactAt?: string
  trustLevel?: 'low' | 'medium' | 'high'
  operationalRisk?: PressureLevel
  unresolvedDependencies?: string[]
  linkedEntities?: string[]
  linkedThreads?: string[]
  attachments?: MediaMemoryAttachment[]
  unresolvedMarkers?: string[]
  continuityObject?: {
    id: string
    kind: string
    title: string
    summary: string
    capturedAt: string
    provenance: {
      who?: string
      what: string
      when: string
      linkedEntity?: string
      linkedOperation?: string
    }
    source: {
      mode: string
      linkUrl?: string
      assetNames?: string[]
      notes?: string
    }
  }
  authorshipTrace?: AuthorshipTrace
  lineageRef?: LineageRef
}

export type MediaMemoryType = 'image' | 'pdf' | 'stage_plot' | 'screenshot' | 'bus_schedule' | 'venue_packet' | 'contract' | 'voice_memo'

export type MediaMemoryAttachment = {
  id: string
  type: MediaMemoryType
  title: string
  url?: string
  previewUrl?: string
  capturedAt?: string
  sourceEventId?: string
  continuityRefId?: string
}

export type UnresolvedObject = {
  id: string
  title: string
  severity?: PressureLevel
  blocking?: boolean
  aging?: number
  operation?: string
}

export type ArtifactEntity = {
  id: string
  title: string
  image?: string
  eventId?: string
}

export type ShowTelaHomeData = {
  activeOps: PersonEntity[]
  fluencyPartners: PersonEntity[]
  operations: OperationEntity[]
  unresolved: UnresolvedObject[]
  continuityFeed: ContinuityEvent[]
  pressureSummary: {
    total: number
    high: number
    medium: number
  }
  runtimeTimeline: RuntimeTimelineItem[]
  source?: DataSource
  diagnosticState?: DiagnosticState
  hydration?: ShowTelaHydrationSummary
  runtimeSnapshotMeta?: ShowTelaRuntimeSnapshotMeta
}

export type ShowTelaHydrationSummary = {
  connectedToNotion: boolean
  connectedToSupabase: boolean
  counts: {
    people: number
    operations: number
    continuity: number
    unresolved: number
    artifacts: number
  }
  lastHydratedAt: string
  cacheSource: DataSource
  supabaseWriteOk?: boolean
  durableArtifactsCompatible?: boolean
  missingRequiredEnv?: string[]
  invalidDatabaseIds?: string[]
}

export type ShowTelaRuntimeSnapshotMeta = {
  snapshotId: string
  workspaceId: string
  updatedAt: string
  canonical: boolean
  overwriteMode: 'merge' | 'replace'
  sourceIngest: 'continuity' | 'directory'
}

export type RuntimeTimelineItem = {
  id: string
  timestamp: string
  actor: string
  summary: string
  continuityObjectId: string
  pressureDelta: -2 | -1 | 0 | 1 | 2
}
