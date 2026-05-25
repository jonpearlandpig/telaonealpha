export type ConstitutionalEventType =
  | 'intent_created'
  | 'routing_completed'
  | 'governance_validated'
  | 'artifact_generated'
  | 'execution_completed'
  | 'continuity_updated'
  | 'decision_locked'

export type GovernanceState =
  | 'exploratory'
  | 'review'
  | 'validated'
  | 'constitutional'
  | 'immutable'

export type ExecutionState =
  | 'pending'
  | 'active'
  | 'completed'
  | 'rejected'
  | 'rolled_back'

export type DecisionState =
  | 'signal'
  | 'proposal'
  | 'recommended'
  | 'approved'
  | 'locked'

export interface ConstitutionalEvent {
  id: string
  created_at: string
  event_version: number
  schema_version: string
  event_type: ConstitutionalEventType
  parent_event_id: string | null
  title: string | null
  summary: string | null
  human_actor: string | null
  operator_overlays: string[]
  governance_state: GovernanceState | null
  execution_state: ExecutionState | null
  decision_state: DecisionState | null
  continuity_refs: string[]
  model_participants: string[]
  routing_metadata: Record<string, unknown>
  confidence_score: number | null
  reversible: boolean
  lineage_hash: string
  metadata: Record<string, unknown>
}

export type CreateConstitutionalEventInput = {
  event_type: ConstitutionalEventType
  parent_event_id?: string | null
  title?: string | null
  summary?: string | null
  human_actor?: string | null
  operator_overlays?: string[]
  governance_state?: GovernanceState | null
  execution_state?: ExecutionState | null
  decision_state?: DecisionState | null
  continuity_refs?: string[]
  model_participants?: string[]
  routing_metadata?: Record<string, unknown>
  confidence_score?: number | null
  reversible?: boolean
  metadata?: Record<string, unknown>
}

export const CONSTITUTIONAL_EVENT_TYPES: ConstitutionalEventType[] = [
  'intent_created',
  'routing_completed',
  'governance_validated',
  'artifact_generated',
  'execution_completed',
  'continuity_updated',
  'decision_locked',
]

export const GOVERNANCE_STATES: GovernanceState[] = [
  'exploratory',
  'review',
  'validated',
  'constitutional',
  'immutable',
]

export const EXECUTION_STATES: ExecutionState[] = [
  'pending',
  'active',
  'completed',
  'rejected',
  'rolled_back',
]

export const DECISION_STATES: DecisionState[] = [
  'signal',
  'proposal',
  'recommended',
  'approved',
  'locked',
]
