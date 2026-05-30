// Replay lineage authority for canonical operational objects.
//
// This module governs:
//   - Replay confirmation of object identity from the event stream
//   - Event-to-object lineage chain construction
//   - Mutation legality (can this event legally mutate this object?)
//   - Provenance validation (does this object have traceable origin?)
//   - Merge legality (can these two objects be merged into one canonical identity?)
//
// Replay lineage is the sovereign authority over object identity.
// Objects persist continuity identity but do NOT supersede replay legitimacy.
//
// No function in this module may modify objects directly.
// Results are returned as typed values — callers perform mutations via operationalObjects.ts.

import type { CanonicalOperationalObject, ObjectProvenance } from './operationalObjects'
import type { RuntimeEvent } from '../runtimeTypes'

// Operational event types from Domain 2 that may mutate canonical object state.
// Governance telemetry (Domain 1) is explicitly excluded — it does not constitute
// operational movement and must not appear in lineage confirmation chains.
// Origin events are always included regardless of type.
const MUTATION_EVENT_TYPES = new Set([
  'continuity.archived',
  'unresolved.created',
  'unresolved.resolved',
  'unresolved.escalated',
  'unresolved.reopened',
  'dependency.created',
  'dependency.resolved',
  'blocker.created',
  'blocker.removed',
  'crew.assigned',
  'crew.confirmed',
  'crew.released',
  'staffing.escalated',
  'handoff.created',
  'handoff.completed',
  'handoff.failed',
  'routing.changed',
  'routing.confirmed',
  'meeting.scheduled',
  'meeting.confirmed',
  'meeting.cancelled',
  'venue.brief.initiated',
  'venue.brief.confirmed',
  'callsheet.generated',
  'callsheet.confirmed',
  'inbox.promoted',
])

// — Result types —

export type LineageConfirmationResult =
  | {
      confirmed: true
      confirmingEventId: string
      sequence: number
    }
  | {
      confirmed: false
      reason:
        | 'no-matching-event'      // no event in the stream references this object or lineage
        | 'event-not-approved'     // matching event exists but governance state is not 'approved'
        | 'sequence-regression'    // event sequence is behind the object's last confirmed sequence
        | 'lineage-mismatch'       // event lineage does not match object lineage
    }

export type MutationLegalityResult =
  | { legal: true; reason: string }
  | {
      legal: false
      reason: string
      violationType:
        | 'governance-blocked'    // event governance state is not 'approved'
        | 'sequence-regression'   // event sequence precedes object's last confirmed sequence
        | 'lineage-break'         // event lineage does not share or extend object lineage
        | 'replay-unconfirmed'    // object not yet replay-confirmed; non-origin event cannot mutate
    }

export type ProvenanceValidationResult =
  | {
      valid: true
      traceDepth: number           // length of confirmed event chain (origin + confirming events)
      confirmedBy: string[]        // event IDs that have approved-state references to this object
    }
  | {
      valid: false
      reason: string
      missingFields: (keyof ObjectProvenance)[]
    }

export type MergeLegalityResult =
  | {
      legal: true
      mergeStrategy:
        | 'take-replay'            // one is replay-confirmed, one is not — take the confirmed one
        | 'take-higher-sequence'   // both confirmed — higher sequence wins identity authority
        | 'merge-payload'          // same sequence or both unconfirmed — deep-merge payloads
    }
  | {
      legal: false
      reason: string
      conflictType:
        | 'workspace-mismatch'         // different workspaces
        | 'type-mismatch'              // different object types
        | 'lineage-conflict'           // no shared lineage — merge would break provenance continuity
        | 'replay-authority-conflict'  // both confirmed with incompatible sequences and no shared lineage
    }

export type LineageChain = {
  objectId: string
  eventIds: string[]         // ordered from oldest to newest replay sequence
  lineageIds: string[]       // lineage IDs referenced across the chain
  rootEventId: string        // originEventId from object provenance
  latestEventId: string
  latestSequence: number
  chainLength: number
  replayConfirmed: boolean   // true if at least one event in the chain is 'approved'
}

// — Core functions —

// Determines whether replay events confirm this object's identity.
//
// An object is replay-confirmed when at least one event with governance state
// 'approved' references this object by ID, lineage, or is its origin event.
// The highest-sequence matching approved event is returned as the confirming event.
export function confirmObjectFromReplay(
  object: CanonicalOperationalObject,
  events: RuntimeEvent[],
): LineageConfirmationResult {
  const candidates = events
    .filter((e) => eventReferencesObject(e, object))
    .sort((a, b) => (a.replaySequence ?? 0) - (b.replaySequence ?? 0))

  if (candidates.length === 0) {
    return { confirmed: false, reason: 'no-matching-event' }
  }

  const approvedCandidate = candidates
    .slice()
    .reverse()
    .find((e) => e.governanceState === 'approved')

  if (!approvedCandidate) {
    return { confirmed: false, reason: 'event-not-approved' }
  }

  const sequence = approvedCandidate.replaySequence ?? 0

  if (
    object.lastConfirmedSequence !== undefined &&
    sequence < object.lastConfirmedSequence
  ) {
    return { confirmed: false, reason: 'sequence-regression' }
  }

  return {
    confirmed: true,
    confirmingEventId: approvedCandidate.id,
    sequence,
  }
}

// Determines whether a runtime event is legally permitted to mutate a canonical object.
//
// Mutation legality requires:
//   1. Event governance state must be 'approved'
//   2. Event is the origin event OR the object is already replay-confirmed
//   3. Event sequence must not precede the object's last confirmed sequence
//   4. Event lineage must match or extend the object's lineage chain
export function checkMutationLegality(
  object: CanonicalOperationalObject,
  event: RuntimeEvent,
): MutationLegalityResult {
  if (event.governanceState !== 'approved') {
    return {
      legal: false,
      reason: `Event governance state '${event.governanceState}' — only 'approved' events may mutate canonical objects`,
      violationType: 'governance-blocked',
    }
  }

  // Origin event always holds mutation rights regardless of replay-confirmation state
  if (event.id === object.provenance.originEventId) {
    return { legal: true, reason: 'origin-event-authority' }
  }

  if (!object.replayConfirmed) {
    return {
      legal: false,
      reason: 'Object not yet replay-confirmed — non-origin events require confirmed object identity',
      violationType: 'replay-unconfirmed',
    }
  }

  if (
    object.lastConfirmedSequence !== undefined &&
    event.replaySequence !== undefined &&
    event.replaySequence < object.lastConfirmedSequence
  ) {
    return {
      legal: false,
      reason: `Event replay sequence ${event.replaySequence} precedes object's last confirmed sequence ${object.lastConfirmedSequence}`,
      violationType: 'sequence-regression',
    }
  }

  if (object.lineageId && event.lineageId && event.lineageId !== object.lineageId) {
    const payload = (event.payload ?? {}) as Record<string, unknown>
    const parentLineageId =
      typeof payload.parentLineageId === 'string' ? payload.parentLineageId : undefined

    if (parentLineageId !== object.lineageId) {
      return {
        legal: false,
        reason: `Event lineage '${event.lineageId}' does not share or extend object lineage '${object.lineageId}'`,
        violationType: 'lineage-break',
      }
    }
  }

  return { legal: true, reason: 'replay-sequence-and-lineage-valid' }
}

// Validates that an object has traceable provenance against the event stream.
//
// Valid provenance requires:
//   - originEventId, originEventType, createdBy are all present
//   - The origin event exists in the provided event stream
export function validateObjectProvenance(
  object: CanonicalOperationalObject,
  events: RuntimeEvent[],
): ProvenanceValidationResult {
  const missing: (keyof ObjectProvenance)[] = []

  if (!object.provenance.originEventId) missing.push('originEventId')
  if (!object.provenance.originEventType) missing.push('originEventType')
  if (!object.provenance.createdBy) missing.push('createdBy')

  if (missing.length > 0) {
    return {
      valid: false,
      reason: 'Object provenance is incomplete — required fields are absent',
      missingFields: missing,
    }
  }

  const originEvent = events.find((e) => e.id === object.provenance.originEventId)
  if (!originEvent) {
    return {
      valid: false,
      reason: `Origin event '${object.provenance.originEventId}' not found in the provided event stream`,
      missingFields: [],
    }
  }

  const confirmedBy = events
    .filter(
      (e) =>
        (e.lineageId === object.lineageId || eventReferencesObject(e, object)) &&
        e.governanceState === 'approved',
    )
    .map((e) => e.id)

  return {
    valid: true,
    traceDepth: confirmedBy.length + 1,  // +1 for the origin event itself
    confirmedBy,
  }
}

// Determines whether two canonical objects can legally be merged.
//
// Merge is legal when:
//   - Same workspace
//   - Same object type
//   - Shared lineage chain (one is in the other's lineage ancestry, or both share a lineageId)
//
// Merge strategy is determined by replay-confirmation state and sequence precedence.
export function checkMergeLegality(
  objectA: CanonicalOperationalObject,
  objectB: CanonicalOperationalObject,
): MergeLegalityResult {
  if (objectA.workspaceId !== objectB.workspaceId) {
    return {
      legal: false,
      reason: `Objects are in different workspaces ('${objectA.workspaceId}' vs '${objectB.workspaceId}')`,
      conflictType: 'workspace-mismatch',
    }
  }

  if (objectA.objectType !== objectB.objectType) {
    return {
      legal: false,
      reason: `Object types differ: '${objectA.objectType}' vs '${objectB.objectType}'`,
      conflictType: 'type-mismatch',
    }
  }

  const sharedLineage =
    objectA.lineageId !== undefined &&
    objectB.lineageId !== undefined &&
    objectA.lineageId === objectB.lineageId

  const lineageParentRelationship =
    objectA.provenance.lineageId === objectB.lineageId ||
    objectB.provenance.lineageId === objectA.lineageId

  if (!sharedLineage && !lineageParentRelationship) {
    return {
      legal: false,
      reason: 'Objects do not share a lineage chain — merge would break provenance continuity',
      conflictType: 'lineage-conflict',
    }
  }

  if (objectA.replayConfirmed && !objectB.replayConfirmed) {
    return { legal: true, mergeStrategy: 'take-replay' }
  }
  if (!objectA.replayConfirmed && objectB.replayConfirmed) {
    return { legal: true, mergeStrategy: 'take-replay' }
  }

  const seqA = objectA.lastConfirmedSequence ?? 0
  const seqB = objectB.lastConfirmedSequence ?? 0

  if (seqA === seqB) {
    return { legal: true, mergeStrategy: 'merge-payload' }
  }

  return { legal: true, mergeStrategy: 'take-higher-sequence' }
}

// Constructs the lineage chain for an object from mutation events only.
// Governance telemetry, routing telemetry, and projection events are excluded —
// only Domain 2 operational events and the object's origin event participate.
// The chain is ordered from oldest to newest by replay sequence.
export function buildLineageChain(
  object: CanonicalOperationalObject,
  events: RuntimeEvent[],
): LineageChain {
  const relevantEvents = events
    .filter((e) => isMutationEvent(e, object) && eventReferencesObject(e, object))
    .sort((a, b) => (a.replaySequence ?? 0) - (b.replaySequence ?? 0))

  const eventIds = relevantEvents.map((e) => e.id)
  const lineageIds = Array.from(
    new Set(
      relevantEvents
        .map((e) => e.lineageId)
        .filter((id): id is string => id !== undefined),
    ),
  )

  const latest = relevantEvents.at(-1)
  const replayConfirmed = relevantEvents.some((e) => e.governanceState === 'approved')

  return {
    objectId: object.id,
    eventIds,
    lineageIds,
    rootEventId: object.provenance.originEventId,
    latestEventId: latest?.id ?? object.provenance.originEventId,
    latestSequence: latest?.replaySequence ?? 0,
    chainLength: eventIds.length,
    replayConfirmed,
  }
}

// — Private helpers —

// Returns true if this event is a mutation event for the given object.
// Origin events always qualify regardless of type.
function isMutationEvent(event: RuntimeEvent, object: CanonicalOperationalObject): boolean {
  if (event.id === object.provenance.originEventId) return true
  return MUTATION_EVENT_TYPES.has(event.type)
}

// Returns true if the event references this object by canonical ID pattern.
// Uses confirmed payload field names from the runtime event taxonomy.
// payload.objectId does not exist — canonical IDs are resolved from typed payload fields.
function eventReferencesObject(
  event: RuntimeEvent,
  object: CanonicalOperationalObject,
): boolean {
  if (event.id === object.provenance.originEventId) return true
  if (object.lineageId && event.lineageId === object.lineageId) return true

  const payload = (event.payload ?? {}) as Record<string, unknown>

  // entity:* objects — resolved from payload.entityId and payload.linkedEntities
  const rawEntityId = typeof payload.entityId === 'string' ? payload.entityId : undefined
  if (rawEntityId && object.id === `entity:${rawEntityId}`) return true

  // thread:* objects — resolved from payload.threadId
  const rawThreadId = typeof payload.threadId === 'string' ? payload.threadId : undefined
  if (rawThreadId && object.id === `thread:${rawThreadId}`) return true

  // routing:* objects — resolved from payload.routingPlanId
  const rawRoutingPlanId = typeof payload.routingPlanId === 'string' ? payload.routingPlanId : undefined
  if (rawRoutingPlanId && object.id === `routing:${rawRoutingPlanId}`) return true

  // entity:* objects from linkedEntities array
  const linkedEntities = Array.isArray(payload.linkedEntities)
    ? (payload.linkedEntities as unknown[]).filter((id): id is string => typeof id === 'string')
    : []
  for (const linkedId of linkedEntities) {
    if (object.id === `entity:${linkedId}`) return true
  }

  return false
}
