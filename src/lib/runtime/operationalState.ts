export type OperationalPriority = { id: string; reason: string; score: number }
export type OperationalObject = {
  id: string
  objectType: 'continuity-thread' | 'decision' | 'governance' | 'entity' | 'routing-plan' | 'legality-check' | 'execution' | 'authorship-guard' | 'readiness-review'
  lineageId?: string
  status: string
  createdAt: string
  updatedAt: string
  payload: Record<string, unknown>
}

export type OperationalRoutingPlan = {
  id: string
  action: string
  rollbackClass: string
  selectedOperators: string[]
  escalationPath: string[]
  governanceState: string
  legal: boolean
  lineageId?: string
  createdAt: string
}

export type LineageEdge = {
  id: string
  lineageId: string
  parentLineageId?: string
  eventId?: string
  relationType: string
  createdAt: string
}

export type GovernanceLegalityState = {
  action: string
  allowed: boolean
  requiredAuthority?: string
  denialReason?: string
  source: 'flightpath' | 'pen-and-sword'
  checkedAt: string
}

export type OperationalState = {
  activeThreads: string[]
  activeProjects: string[]
  unresolvedContinuity: string[]
  pinnedContinuity: string[]
  recentDecisions: string[]
  activeEntities: string[]
  recentLineage: string[]
  operationalObjects: OperationalObject[]
  routingPlans: OperationalRoutingPlan[]
  lineageGraph: LineageEdge[]
  currentPriorities: OperationalPriority[]
  continuityIntensity: number
  operationalDrift: number
  staleImportantMemory: string[]
  governanceLegality: GovernanceLegalityState[]
  governanceOutcomes?: {
    blocked: number
    denied: number
    escalated: number
    pending: number
    lastEscalationAt?: string
  }
}
