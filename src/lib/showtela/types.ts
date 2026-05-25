export type PressureLevel = 'low' | 'medium' | 'high' | 'critical'

export type ContinuityClassification =
  | 'venue'
  | 'staffing'
  | 'logistics'
  | 'hospitality'
  | 'legal'
  | 'financial'
  | 'creative'
  | 'technical'
  | 'unresolved'
  | 'update'
  | 'decision'

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
  summary?: string
  rawTranscript?: string
  timestamp?: string
  image?: string
  tags?: string[]
  owner?: PersonEntity
  pressure?: PressureLevel
  classification?: ContinuityClassification
  nextActions?: string[]
  confidence?: number
  normalizedBy?: 'claude'
  normalizationVersion?: string
  replayVersion?: string
  sourceMode?: string
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
  source?: 'notion' | 'supabase' | 'empty'
  dataMode?: 'live' | 'demo'
}

export type RuntimeTimelineItem = {
  id: string
  timestamp: string
  actor: string
  summary: string
  continuityObjectId: string
  pressureDelta: -2 | -1 | 0 | 1 | 2
}
