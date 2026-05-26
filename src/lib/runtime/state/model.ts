export const OPERATIONAL_STATE_DERIVATION_VERSION = 'operational-state.v1'
export const OPERATIONAL_PROJECTION_VERSION = 'operational-projection.v1'

export type OperationalStateSeverity = 'low' | 'medium' | 'high' | 'critical'

export type OperationalStateLifecycle =
  | 'entered'
  | 'acknowledged'
  | 'escalated'
  | 'resolved'
  | 'superseded'
  | 'expired'

export type OperationalStateCode =
  | 'AWAITING_COMMITMENT'
  | 'FINANCING_GATE'
  | 'ROUTING_PENDING'
  | 'UNRESOLVED_DEPENDENCY'
  | 'ESCALATION_RISK'
  | 'ACTIVELY_MOVING'
  | 'READY_TO_ADVANCE'
  | 'GOVERNANCE_BLOCKED'
  | 'STALE_PRESSURE'

export type DependencyNodeKind =
  | 'thread'
  | 'entity'
  | 'project'
  | 'unresolved'
  | 'event'
  | 'object'
  | 'external'

export type DependencyNode = {
  id: string
  label: string
  kind: DependencyNodeKind
  status: string
  sourceEventIds: string[]
}

export type DependencyEdge = {
  from: string
  to: string
  relation: 'blocked-by' | 'waiting-on' | 'depends-on' | 'informs' | 'governed-by'
  sourceEventIds: string[]
}

export type DependencyGraph = {
  nodes: Record<string, DependencyNode>
  edges: DependencyEdge[]
}

export type DependencyPressure = {
  nodeId: string
  directBlockers: number
  chainDepth: number
  escalations: number
  pendingGovernance: number
  score: number
}

export type OperationalStateRecord = {
  stateId: string
  entityId: string
  entityType: string
  entityName: string
  stateCode: OperationalStateCode
  stateLabel: string
  stateEmoji: string
  severity: OperationalStateSeverity
  lifecycle: OperationalStateLifecycle
  triggerDetail: string
  resolutionAction?: string
  resolutionOwner?: string
  dependencyIds: string[]
  dependencyChain: string[]
  reasoningChain: string[]
  derivationSource: 'runtime-events' | 'governance' | 'dependency-graph' | 'heuristic'
  explanation?: string
  sourceEventIds?: string[]
  lineageIds?: string[]
  traceId?: string
  derivedAt: string
  derivationVersion: string
}

export type OperationalProjectionSummary = {
  currentTruth: string
  mattersNow: string
  nextMovement: string
  blockersLabel: string
  movementLabel: string
  readinessLabel: string
}

export type OperationalProjection = {
  workspaceId: string
  showId: string
  projectionVersion: string
  generatedAt: string
  derivedAt: string
  derivationVersion: string
  derivedFromEventCount: number
  replayCursor?: number
  states: OperationalStateRecord[]
  blockers: OperationalStateRecord[]
  movement: OperationalStateRecord[]
  readiness: OperationalStateRecord[]
  escalations: OperationalStateRecord[]
  dependencyChains: string[][]
  groupedTopology: {
    critical: number
    high: number
    medium: number
    low: number
    blockers: number
    movement: number
    readiness: number
    escalations: number
  }
  summary: OperationalProjectionSummary
}

export type PersistedOperationalStateRow = {
  state_id: string
  entity_id: string
  entity_type: string
  entity_name: string
  state_code: OperationalStateCode
  state_label: string
  state_emoji: string | null
  severity: OperationalStateSeverity
  lifecycle_state: OperationalStateLifecycle
  trigger_detail: string
  resolution_action: string | null
  resolution_owner: string | null
  dependency_ids: string[] | null
  dependency_chain: string[] | null
  reasoning_chain: string[] | null
  derivation_source: string | null
  workspace_id: string
  show_id: string
  is_active: boolean
  state_entered_at: string
  state_updated_at: string
  derivation_version: string
  derived_at: string
  explanation: string | null
  source_event_ids: string[] | null
  trace_id: string | null
  projection_version: string
  lineage_ids: string[] | null
}
