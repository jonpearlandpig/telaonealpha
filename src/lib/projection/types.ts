export type ProjectionBlockerSeverity = 'low' | 'medium' | 'high' | 'critical'

export type ProjectionBlocker = {
  id: string
  title: string
  severity: ProjectionBlockerSeverity
  ownerId?: string
  sourceArtifact?: string
}

export type ShowProjection = {
  showId: string
  venue: string
  city: string
  date: string
  readiness: number
  riderAccepted: boolean
  callSheetIssued: boolean
  rosterLocked: boolean
  blockers: ProjectionBlocker[]
  owners: string[]
  daysUntilShow: number
}

export type OperationalProjection = {
  nextShow?: ShowProjection
  activeBlockers: ProjectionBlocker[]
  readinessScore: number
  openPressure: number
  nextMeaningfulMovement?: string
}

export type ProjectionDiagnostic = {
  dataSource: string
  activeBlockerCount: number
  knownSignals: string[]
  unknownSignals: string[]
  confidence: 'none' | 'partial' | 'full'
  readinessScore: number
  openPressure: number
  generatedAt: string
}
