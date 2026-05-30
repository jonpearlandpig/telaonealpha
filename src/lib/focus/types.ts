export type FocusItem = {
  id: string
  title: string
  owner: string
  ownerId: string
  priorityScore: number
  impactScore: number
  timeSensitivity: number
  dependencyWeight: number
  pressureScore: number
  reason: string
  recommendedAction: string
  linkedEntities: string[]
  sourceIds: string[]
}

export type FocusEngineResult = {
  topFocus: FocusItem | null
  secondaryFocus: FocusItem | null
  allFocusItems: FocusItem[]
}

export type FocusConfidence = 'none' | 'partial' | 'full'

export type FocusDiagnostic = {
  knownSignals: string[]
  unknownSignals: string[]
  confidence: FocusConfidence
}
