export type BriefingChangeType = 'new-event' | 'resolved' | 'new-blocker' | 'escalation'

export type BriefingChange = {
  id: string
  headline: string
  timestamp: string
  owner: string
  type: BriefingChangeType
}

export type OperationalBrief = {
  headline: string
  generatedAt: string
  newEvents: number
  resolvedItems: number
  newBlockers: number
  currentReadiness: number
  previousReadiness: number
  readinessDelta: number
  topFocus: { title: string; priority: number } | null
  recommendedAction: string
  changes: BriefingChange[]
  improvements: BriefingChange[]
  concerns: BriefingChange[]
}

export type BriefingConfidence = 'none' | 'partial' | 'full'

export type BriefingDiagnostic = {
  knownSignals: string[]
  unknownSignals: string[]
  confidence: BriefingConfidence
}
