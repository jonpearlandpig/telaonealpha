import type { OperationalObject } from '../operationalState'

export const OPERATIONAL_ONTOLOGY_VERSION = 'operational-ontology.v1'

export type OperationalOntologyType =
  | 'continuity-thread'
  | 'operational-task'
  | 'person'
  | 'venue'
  | 'schedule-item'
  | 'logistics-item'
  | 'unresolved-item'
  | 'decision'
  | 'artifact'
  | 'communication'
  | 'escalation'
  | 'approval'

export type OntologyReplaySource = OperationalObject['objectType']

export type OntologyReconciliationStrategy =
  | 'canonical-id'
  | 'canonical-id-and-lineage'
  | 'canonical-id-lineage-and-sequence'

export type OntologyIdentityRequirement =
  | 'canonical-object-id'
  | 'thread-id'
  | 'entity-id'
  | 'lineage-id'
  | 'approved-replay-event'
  | 'replay-sequence'

export type OperationalOntologyDefinition = {
  canonicalType: OperationalOntologyType
  allowedReplaySources: readonly OntologyReplaySource[]
  reconciliationStrategy: OntologyReconciliationStrategy
  identityRequirements: readonly OntologyIdentityRequirement[]
  promotionRequirements: readonly OntologyIdentityRequirement[]
  persistenceRequirements: readonly string[]
}

export const OPERATIONAL_ONTOLOGY_REGISTRY: Record<OperationalOntologyType, OperationalOntologyDefinition> = {
  'continuity-thread': {
    canonicalType: 'continuity-thread',
    allowedReplaySources: ['continuity-thread'],
    reconciliationStrategy: 'canonical-id-lineage-and-sequence',
    identityRequirements: ['canonical-object-id', 'thread-id'],
    promotionRequirements: ['approved-replay-event', 'replay-sequence'],
    persistenceRequirements: ['append-only-merge-history', 'lineage-safe-replay-confirmation'],
  },
  'operational-task': {
    canonicalType: 'operational-task',
    allowedReplaySources: ['routing-plan', 'execution', 'entity'],
    reconciliationStrategy: 'canonical-id-lineage-and-sequence',
    identityRequirements: ['canonical-object-id'],
    promotionRequirements: ['approved-replay-event', 'replay-sequence'],
    persistenceRequirements: ['stable-identity', 'append-only-merge-history'],
  },
  person: {
    canonicalType: 'person',
    allowedReplaySources: ['entity'],
    reconciliationStrategy: 'canonical-id-and-lineage',
    identityRequirements: ['canonical-object-id', 'entity-id'],
    promotionRequirements: ['approved-replay-event'],
    persistenceRequirements: ['stable-identity', 'lineage-safe-replay-confirmation'],
  },
  venue: {
    canonicalType: 'venue',
    allowedReplaySources: ['entity'],
    reconciliationStrategy: 'canonical-id-and-lineage',
    identityRequirements: ['canonical-object-id', 'entity-id'],
    promotionRequirements: ['approved-replay-event'],
    persistenceRequirements: ['stable-identity', 'lineage-safe-replay-confirmation'],
  },
  'schedule-item': {
    canonicalType: 'schedule-item',
    allowedReplaySources: ['entity'],
    reconciliationStrategy: 'canonical-id-and-lineage',
    identityRequirements: ['canonical-object-id', 'entity-id'],
    promotionRequirements: ['approved-replay-event', 'replay-sequence'],
    persistenceRequirements: ['stable-identity', 'append-only-merge-history'],
  },
  'logistics-item': {
    canonicalType: 'logistics-item',
    allowedReplaySources: ['entity'],
    reconciliationStrategy: 'canonical-id-and-lineage',
    identityRequirements: ['canonical-object-id', 'entity-id'],
    promotionRequirements: ['approved-replay-event'],
    persistenceRequirements: ['stable-identity', 'append-only-merge-history'],
  },
  'unresolved-item': {
    canonicalType: 'unresolved-item',
    allowedReplaySources: ['entity'],
    reconciliationStrategy: 'canonical-id-lineage-and-sequence',
    identityRequirements: ['canonical-object-id', 'entity-id'],
    promotionRequirements: ['approved-replay-event', 'replay-sequence'],
    persistenceRequirements: ['stable-identity', 'lineage-safe-replay-confirmation'],
  },
  decision: {
    canonicalType: 'decision',
    allowedReplaySources: ['decision'],
    reconciliationStrategy: 'canonical-id-lineage-and-sequence',
    identityRequirements: ['canonical-object-id'],
    promotionRequirements: ['approved-replay-event', 'replay-sequence'],
    persistenceRequirements: ['stable-identity', 'append-only-merge-history'],
  },
  artifact: {
    canonicalType: 'artifact',
    allowedReplaySources: ['authorship-guard'],
    reconciliationStrategy: 'canonical-id-and-lineage',
    identityRequirements: ['canonical-object-id'],
    promotionRequirements: ['approved-replay-event'],
    persistenceRequirements: ['stable-identity', 'append-only-merge-history'],
  },
  communication: {
    canonicalType: 'communication',
    allowedReplaySources: ['entity'],
    reconciliationStrategy: 'canonical-id-and-lineage',
    identityRequirements: ['canonical-object-id', 'entity-id'],
    promotionRequirements: ['approved-replay-event'],
    persistenceRequirements: ['stable-identity', 'append-only-merge-history'],
  },
  escalation: {
    canonicalType: 'escalation',
    allowedReplaySources: ['governance'],
    reconciliationStrategy: 'canonical-id-lineage-and-sequence',
    identityRequirements: ['canonical-object-id'],
    promotionRequirements: ['approved-replay-event', 'replay-sequence'],
    persistenceRequirements: ['stable-identity', 'lineage-safe-replay-confirmation'],
  },
  approval: {
    canonicalType: 'approval',
    allowedReplaySources: ['legality-check'],
    reconciliationStrategy: 'canonical-id-lineage-and-sequence',
    identityRequirements: ['canonical-object-id'],
    promotionRequirements: ['approved-replay-event', 'replay-sequence'],
    persistenceRequirements: ['stable-identity', 'lineage-safe-replay-confirmation'],
  },
}

export function getOperationalOntologyDefinition(
  canonicalType: OperationalOntologyType,
): OperationalOntologyDefinition {
  return OPERATIONAL_ONTOLOGY_REGISTRY[canonicalType]
}
