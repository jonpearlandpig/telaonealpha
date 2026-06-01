import type { OperationalObject } from '../operationalState'
import type { RuntimeEvent } from '../runtimeTypes'
import {
  getOperationalOntologyDefinition,
  OPERATIONAL_ONTOLOGY_VERSION,
  type OperationalOntologyDefinition,
  type OperationalOntologyType,
} from './operationalOntology'

export const REPLAY_NORMALIZATION_PASS = 'replay-normalization.v1'

export type NormalizationIdentitySource =
  | 'object-id'
  | 'thread-id'
  | 'entity-prefix'
  | 'payload-routing-plan-id'
  | 'payload-action'

export type ReplayNormalizationDiagnostics = {
  ontologyVersion: typeof OPERATIONAL_ONTOLOGY_VERSION
  replayNormalizationPass: typeof REPLAY_NORMALIZATION_PASS
  canonicalIdentitySource: NormalizationIdentitySource
}

export type NormalizedOperationalReplayObject = {
  storageId: string
  canonicalObjectId: string
  ontologyType: OperationalOntologyType
  ontology: OperationalOntologyDefinition
  sourceObjectType: OperationalObject['objectType']
  sourceEventId: string
  sourceEventType: string
  replaySequence: number | undefined
  lineageId: string | undefined
  replayConfirmed: boolean
  lastConfirmedSequence: number | undefined
  createdAt: string
  updatedAt: string
  status: string
  payload: Record<string, unknown>
  diagnostics: ReplayNormalizationDiagnostics
}

export function normalizeReplayDerivedObject(input: {
  object: OperationalObject
  event: RuntimeEvent
  replayConfirmed: boolean
  lastConfirmedSequence?: number
}): NormalizedOperationalReplayObject {
  const { object, event, replayConfirmed, lastConfirmedSequence } = input
  const identity = determineOntologyIdentity(object, event)
  const ontology = getOperationalOntologyDefinition(identity.ontologyType)

  return {
    storageId: object.id,
    canonicalObjectId: object.id,
    ontologyType: identity.ontologyType,
    ontology,
    sourceObjectType: object.objectType,
    sourceEventId: event.id,
    sourceEventType: event.type,
    replaySequence: event.replaySequence,
    lineageId: object.lineageId,
    replayConfirmed,
    lastConfirmedSequence,
    createdAt: object.createdAt,
    updatedAt: object.updatedAt,
    status: object.status,
    payload: {
      ...object.payload,
      canonicalType: identity.ontologyType,
    },
    diagnostics: {
      ontologyVersion: OPERATIONAL_ONTOLOGY_VERSION,
      replayNormalizationPass: REPLAY_NORMALIZATION_PASS,
      canonicalIdentitySource: identity.identitySource,
    },
  }
}

function determineOntologyIdentity(
  object: OperationalObject,
  event: RuntimeEvent,
): {
  ontologyType: OperationalOntologyType
  identitySource: NormalizationIdentitySource
} {
  if (object.objectType === 'continuity-thread') {
    return {
      ontologyType: 'continuity-thread',
      identitySource: typeof object.payload.threadId === 'string' ? 'thread-id' : 'object-id',
    }
  }

  if (object.objectType === 'routing-plan') {
    return {
      ontologyType: 'operational-task',
      identitySource: typeof object.payload.routingPlanId === 'string' ? 'payload-routing-plan-id' : 'object-id',
    }
  }

  if (object.objectType === 'execution') {
    return {
      ontologyType: 'operational-task',
      identitySource: typeof object.payload.action === 'string' ? 'payload-action' : 'object-id',
    }
  }

  if (object.objectType === 'legality-check') {
    return {
      ontologyType: 'approval',
      identitySource: typeof object.payload.action === 'string' ? 'payload-action' : 'object-id',
    }
  }

  if (object.objectType === 'governance') {
    return {
      ontologyType: 'escalation',
      identitySource: 'object-id',
    }
  }

  if (object.objectType === 'decision') {
    return {
      ontologyType: 'decision',
      identitySource: 'object-id',
    }
  }

  if (object.objectType === 'authorship-guard') {
    return {
      ontologyType: 'artifact',
      identitySource: 'object-id',
    }
  }

  if (object.objectType === 'readiness-review') {
    return {
      ontologyType: 'operational-task',
      identitySource: 'object-id',
    }
  }

  if (object.objectType === 'entity') {
    return {
      ontologyType: ontologyTypeForEntityId(object, event),
      identitySource: 'entity-prefix',
    }
  }

  return {
    ontologyType: 'communication',
    identitySource: 'object-id',
  }
}

function ontologyTypeForEntityId(
  object: OperationalObject,
  event: RuntimeEvent,
): OperationalOntologyType {
  const entityId = typeof object.payload.entityId === 'string'
    ? object.payload.entityId
    : typeof event.payload?.entityId === 'string'
      ? event.payload.entityId
      : undefined

  if (!entityId) return 'communication'
  if (entityId.startsWith('person:')) return 'person'
  if (entityId.startsWith('venue:')) return 'venue'
  if (entityId.startsWith('schedule:') || entityId.startsWith('meeting:')) return 'schedule-item'
  if (entityId.startsWith('logistics:')) return 'logistics-item'
  if (entityId.startsWith('unresolved:')) return 'unresolved-item'
  if (entityId.startsWith('artifact:')) return 'artifact'
  if (
    entityId.startsWith('project:') ||
    entityId.startsWith('show:') ||
    entityId.startsWith('tour:') ||
    entityId.startsWith('task:') ||
    entityId.startsWith('routing:') ||
    entityId.startsWith('execution:')
  ) {
    return 'operational-task'
  }
  if (
    entityId.startsWith('message:') ||
    entityId.startsWith('email:') ||
    entityId.startsWith('call:') ||
    entityId.startsWith('thread-message:')
  ) {
    return 'communication'
  }
  return 'operational-task'
}
