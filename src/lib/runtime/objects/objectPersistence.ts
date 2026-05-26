// Persistence contract for canonical operational objects.
//
// Maps CanonicalOperationalObject ↔ operational_objects Supabase table.
// Uses the existing OperationalObjectRow schema from supabase/schema.ts as the
// base row type, extended with canonical persistence fields.
//
// NOTE: The existing OperationalObjectRow in schema.ts does not include workspaceId
// or the canonical extension fields (replay_confirmed, merge_history, provenance).
// Phase 2 requires a schema migration to add these columns to operational_objects.
// This module defines the target row shape and pure serialization/deserialization
// functions against it. No Supabase client calls are made here.
//
// Pure functions in this file:
//   - serializeObject      CanonicalOperationalObject → CanonicalObjectRow
//   - deserializeObject    CanonicalObjectRow → CanonicalOperationalObject
//   - mergeObjectRows      row-level conflict resolution (pure, deterministic)
//   - validateObjectRow    unknown → CanonicalObjectRow type guard
//
// Async contracts (to be implemented in Phase 2 against Supabase client):
//   - PersistenceContract  typed async interface for all persistence operations

import type { OperationalObject } from '../operationalState'
import type {
  CanonicalOperationalObject,
  ObjectMergeRecord,
  ObjectProvenance,
} from './operationalObjects'

// Extended row type for the canonical objects layer.
// Adds canonical fields to the existing operational_objects table.
// Phase 2 migration adds: workspace_id, replay_confirmed, last_confirmed_sequence,
// augmented_at, merge_history, provenance.
export type CanonicalObjectRow = {
  // Existing operational_objects columns
  id: string
  object_type: OperationalObject['objectType']
  lineage_id: string | null
  status: string
  payload: Record<string, unknown>
  created_at: string
  updated_at: string
  // Canonical extension columns (added in Phase 2 schema migration)
  workspace_id: string
  replay_confirmed: boolean
  last_confirmed_sequence: number | null
  augmented_at: string | null
  merge_history: ObjectMergeRecord[] | null
  provenance: ObjectProvenance | null
}

// Typed result for all persistence operations.
// Allows callers to handle persistence failures without throwing.
export type PersistenceResult<T> =
  | { ok: true; data: T }
  | {
      ok: false
      error: string
      code:
        | 'not-found'
        | 'schema-mismatch'
        | 'write-failed'
        | 'read-failed'
        | 'workspace-mismatch'
    }

// Typed async contract for canonical object persistence.
// Implemented against the Supabase client in Phase 2.
// Callers depend only on this interface, not on Supabase directly.
export type PersistenceContract = {
  // Persist a single object. Returns the persisted object's ID on success.
  persistObject(
    workspaceId: string,
    object: CanonicalOperationalObject,
  ): Promise<PersistenceResult<string>>

  // Load all canonical objects for a workspace.
  loadObjects(
    workspaceId: string,
  ): Promise<PersistenceResult<CanonicalOperationalObject[]>>

  // Upsert a batch of objects. Returns the number of rows affected.
  upsertObjects(
    workspaceId: string,
    objects: CanonicalOperationalObject[],
  ): Promise<PersistenceResult<number>>

  // Delete a single object by ID. Returns true if the row was deleted.
  deleteObject(
    workspaceId: string,
    objectId: string,
  ): Promise<PersistenceResult<boolean>>
}

// Serializes a CanonicalOperationalObject to the canonical row shape.
// Pure function — no I/O.
export function serializeObject(object: CanonicalOperationalObject): CanonicalObjectRow {
  return {
    id: object.id,
    workspace_id: object.workspaceId,
    object_type: object.objectType,
    lineage_id: object.lineageId ?? null,
    status: object.status,
    payload: object.payload,
    created_at: object.createdAt,
    updated_at: object.updatedAt,
    replay_confirmed: object.replayConfirmed,
    last_confirmed_sequence: object.lastConfirmedSequence ?? null,
    augmented_at: object.augmentedAt ?? null,
    merge_history: object.mergeHistory.length > 0 ? object.mergeHistory : null,
    provenance: object.provenance,
  }
}

// Deserializes a canonical row to a CanonicalOperationalObject.
// Pure function — no I/O.
// Falls back to safe defaults when canonical extension columns are absent
// (tolerates rows written before the Phase 2 schema migration).
export function deserializeObject(row: CanonicalObjectRow): CanonicalOperationalObject {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    objectType: row.object_type,
    lineageId: row.lineage_id ?? undefined,
    status: row.status,
    payload: row.payload,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    replayConfirmed: row.replay_confirmed ?? false,
    lastConfirmedSequence: row.last_confirmed_sequence ?? undefined,
    augmentedAt: row.augmented_at ?? undefined,
    mergeHistory: row.merge_history ?? [],
    provenance: row.provenance ?? {
      originEventId: 'unknown',
      originEventType: 'unknown',
      createdBy: 'replay',
    },
  }
}

// Row-level merge for upsert conflict resolution.
//
// Rules:
//   - workspace_id, id, object_type, created_at: never mutated by merge
//   - status: replay-confirmed incoming wins; ingest-only incoming defers to existing
//   - payload: always deep-merged (incoming extends, never erases)
//   - replay_confirmed: once true, stays true
//   - last_confirmed_sequence: highest value wins
//   - merge_history: append-only, capped at 20 entries
//
// Pure function — no I/O.
export function mergeObjectRows(
  existing: CanonicalObjectRow,
  incoming: CanonicalObjectRow,
): CanonicalObjectRow {
  const now = new Date().toISOString()

  const incomingWinsStatus =
    incoming.replay_confirmed && !existing.replay_confirmed

  const nextStatus = incomingWinsStatus ? incoming.status : existing.status

  const nextSequence =
    incoming.last_confirmed_sequence !== null &&
    (existing.last_confirmed_sequence === null ||
      incoming.last_confirmed_sequence > existing.last_confirmed_sequence)
      ? incoming.last_confirmed_sequence
      : existing.last_confirmed_sequence

  const mergedHistory = [
    ...(existing.merge_history ?? []),
    ...(incoming.merge_history ?? []),
  ].slice(-20)

  return {
    ...existing,
    status: nextStatus,
    payload: { ...existing.payload, ...incoming.payload },
    updated_at: now,
    replay_confirmed: existing.replay_confirmed || incoming.replay_confirmed,
    last_confirmed_sequence: nextSequence,
    augmented_at: incoming.augmented_at ?? existing.augmented_at,
    merge_history: mergedHistory.length > 0 ? mergedHistory : null,
  }
}

// Type guard — validates that an unknown value has the minimum fields required
// to be treated as a CanonicalObjectRow. Used before deserializeObject.
export function validateObjectRow(row: unknown): row is CanonicalObjectRow {
  if (!row || typeof row !== 'object') return false
  const r = row as Record<string, unknown>
  return (
    typeof r.id === 'string' &&
    typeof r.workspace_id === 'string' &&
    typeof r.object_type === 'string' &&
    typeof r.status === 'string' &&
    typeof r.created_at === 'string' &&
    typeof r.updated_at === 'string' &&
    (r.payload === undefined || (typeof r.payload === 'object' && r.payload !== null))
  )
}

// Serializes a batch of objects to rows. Pure function.
export function serializeObjectBatch(
  objects: CanonicalOperationalObject[],
): CanonicalObjectRow[] {
  return objects.map(serializeObject)
}

// Deserializes a batch of rows to canonical objects.
// Rows that fail validation are skipped with a console warning.
// Pure function aside from the warning output.
export function deserializeObjectBatch(rows: unknown[]): CanonicalOperationalObject[] {
  const result: CanonicalOperationalObject[] = []
  for (const row of rows) {
    if (validateObjectRow(row)) {
      result.push(deserializeObject(row))
    } else {
      console.warn('[objects:objectPersistence] invalid row skipped during deserialization', row)
    }
  }
  return result
}
