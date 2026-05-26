// Canonical operational entity registry.
//
// Persistent identity layer — objects survive session restarts and event replay gaps.
// Objects are AUGMENTED by ingest and CONFIRMED by replay. Neither operation
// replaces canonical identity wholesale.
//
// Replay lineage is sovereign authority.
// Objects persist continuity identity only — they do not supersede replay legitimacy.

import type { OperationalObject } from '../operationalState'

// Extends the base OperationalObject with canonical persistence fields.
// The base type is preserved so existing replay reconstruction is not disrupted.
export type CanonicalOperationalObject = OperationalObject & {
  workspaceId: string
  replayConfirmed: boolean          // true when at least one approved replay event has confirmed this object
  lastConfirmedSequence?: number    // highest replay sequence that confirmed this object's identity
  augmentedAt?: string              // last time ingest augmented this object (distinct from replay confirmation)
  mergeHistory: ObjectMergeRecord[] // append-only audit trail of all merge operations
  provenance: ObjectProvenance
}

export type ObjectProvenance = {
  originEventId: string             // the event that first created this object
  originEventType: string
  lineageId?: string                // lineage chain root if known at creation time
  createdBy: 'replay' | 'ingest' | 'governance'
  confirmedBy?: string[]            // event IDs that have replay-confirmed this object
}

export type ObjectMergeRecord = {
  mergedAt: string
  sourceEventId: string
  fieldsChanged: string[]
  mergedBy: 'replay' | 'ingest'
}

export type ObjectIdentityKey = {
  workspaceId: string
  objectId: string
}

export type ObjectResolutionResult =
  | { found: true; object: CanonicalOperationalObject }
  | { found: false; reason: 'not-found' | 'workspace-mismatch' | 'lineage-unconfirmed' }

export type ObjectMergeResult = {
  merged: CanonicalOperationalObject
  record: ObjectMergeRecord
  conflicts: ObjectConflict[]
}

export type ObjectConflict = {
  field: string
  existingValue: unknown
  incomingValue: unknown
  resolution: 'kept-existing' | 'took-incoming' | 'merged-payload'
}

export type ObjectSetReconciliationResult = {
  reconciled: CanonicalOperationalObject[]
  added: CanonicalOperationalObject[]
  updated: CanonicalOperationalObject[]
}

// Creates a new canonical object from a base OperationalObject.
// All canonical objects must be created through this function to guarantee
// provenance fields are present from the start.
export function createCanonicalObject(
  base: OperationalObject,
  workspaceId: string,
  originEventId: string,
  originEventType: string,
  createdBy: 'replay' | 'ingest' | 'governance',
  lineageId?: string,
): CanonicalOperationalObject {
  return {
    ...base,
    workspaceId,
    replayConfirmed: createdBy === 'replay',
    mergeHistory: [],
    provenance: {
      originEventId,
      originEventType,
      lineageId,
      createdBy,
    },
  }
}

// Resolves a canonical object by its identity key.
// Returns the object if found in the given set, or a typed failure.
export function resolveObjectIdentity(
  objects: CanonicalOperationalObject[],
  key: ObjectIdentityKey,
): ObjectResolutionResult {
  const match = objects.find(
    (o) => o.id === key.objectId && o.workspaceId === key.workspaceId,
  )
  if (!match) return { found: false, reason: 'not-found' }
  return { found: true, object: match }
}

// Augments an existing canonical object with incoming data.
//
// Merge rules:
//   - Status: replay confirmation always wins over ingest augmentation.
//     If mergedBy === 'replay', status is always taken from incoming.
//     If mergedBy === 'ingest' and object is already replay-confirmed, keep existing status.
//   - Payload: always deep-merged. Ingest may extend payload but not erase replay-confirmed fields.
//   - mergeHistory: append-only.
export function augmentObject(
  existing: CanonicalOperationalObject,
  incoming: Partial<OperationalObject>,
  sourceEventId: string,
  mergedBy: 'replay' | 'ingest',
): ObjectMergeResult {
  const fieldsChanged: string[] = []
  const conflicts: ObjectConflict[] = []
  const now = new Date().toISOString()

  let nextStatus = existing.status
  if (incoming.status !== undefined && incoming.status !== existing.status) {
    if (mergedBy === 'replay' || !existing.replayConfirmed) {
      nextStatus = incoming.status
      fieldsChanged.push('status')
    } else {
      conflicts.push({
        field: 'status',
        existingValue: existing.status,
        incomingValue: incoming.status,
        resolution: 'kept-existing',
      })
    }
  }

  let mergedPayload = existing.payload
  if (incoming.payload) {
    mergedPayload = { ...existing.payload, ...incoming.payload }
    fieldsChanged.push('payload')
  }

  const record: ObjectMergeRecord = {
    mergedAt: now,
    sourceEventId,
    fieldsChanged,
    mergedBy,
  }

  const merged: CanonicalOperationalObject = {
    ...existing,
    status: nextStatus,
    payload: mergedPayload,
    updatedAt: now,
    augmentedAt: mergedBy === 'ingest' ? now : existing.augmentedAt,
    replayConfirmed: mergedBy === 'replay' ? true : existing.replayConfirmed,
    mergeHistory: [...existing.mergeHistory, record],
  }

  return { merged, record, conflicts }
}

// Reconciles an incoming object set against an existing canonical set.
// New objects are added. Existing objects are augmented (not replaced).
// Returns the full reconciled set plus change audit.
export function reconcileObjectSet(
  existing: CanonicalOperationalObject[],
  incoming: CanonicalOperationalObject[],
  mergedBy: 'replay' | 'ingest',
): ObjectSetReconciliationResult {
  const byId = new Map(existing.map((o) => [o.id, o]))
  const added: CanonicalOperationalObject[] = []
  const updated: CanonicalOperationalObject[] = []

  for (const obj of incoming) {
    const current = byId.get(obj.id)
    if (!current) {
      byId.set(obj.id, obj)
      added.push(obj)
    } else {
      const { merged } = augmentObject(current, obj, obj.provenance.originEventId, mergedBy)
      byId.set(obj.id, merged)
      updated.push(merged)
    }
  }

  return {
    reconciled: [...byId.values()],
    added,
    updated,
  }
}

// Marks an object as replay-confirmed at a specific sequence number.
// Called by the replay layer after a confirmed event references this object.
export function confirmObjectAtSequence(
  object: CanonicalOperationalObject,
  sequence: number,
  confirmingEventId: string,
): CanonicalOperationalObject {
  const alreadyConfirmed =
    object.lastConfirmedSequence !== undefined && sequence <= object.lastConfirmedSequence

  if (alreadyConfirmed) return object

  return {
    ...object,
    replayConfirmed: true,
    lastConfirmedSequence: sequence,
    provenance: {
      ...object.provenance,
      confirmedBy: [...(object.provenance.confirmedBy ?? []), confirmingEventId],
    },
  }
}
