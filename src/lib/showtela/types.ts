export type PressureLevel = 'low' | 'medium' | 'high'

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
}
