export type ReplayStepState =
  | 'BLOCKER_CREATED'
  | 'BLOCKER_RESOLVED'
  | 'PRESSURE_INCREASED'
  | 'PRESSURE_DECREASED'
  | 'DEPENDENCY_ADDED'
  | 'DEPENDENCY_CLEARED'
  | 'FOCUS_EVENT'
  | 'CONTINUITY_RECORDED'

export type ReplayStep = {
  id: string
  timestamp: string
  headline: string
  owner: string
  linkedEntities: string[]
  resultingState: ReplayStepState
  explanation: string
  readinessDelta: number
  isBlocker: boolean
  isFocusRelated: boolean
  isResolution: boolean
}

export type ReplayOutput = {
  generatedAt: string
  stepCount: number
  currentReadiness: number
  topFocus: { title: string; priority: number } | null
  timeline: ReplayStep[]
}

export type ReplayConfidence = 'none' | 'partial' | 'full'

export type ReplayDiagnostic = {
  knownSignals: string[]
  unknownSignals: string[]
  confidence: ReplayConfidence
}
