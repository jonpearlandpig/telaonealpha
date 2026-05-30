import 'server-only'

import { getSupabaseServerClient } from '@/lib/supabase/server'
import type { CanonicalOperationalObject } from './operationalObjects'
import type {
  CanonicalObjectRow,
  PersistenceContract,
  PersistenceResult,
} from './objectPersistence'
import {
  deserializeObjectBatch,
  mergeObjectRows,
  serializeObject,
  serializeObjectBatch,
  validateObjectRow,
} from './objectPersistence'

// Supabase-backed implementation of PersistenceContract.
// All operations are scoped to operational_objects with the Phase 2 canonical extension columns.
// No callers outside the objects layer should import this directly —
// depend on PersistenceContract instead.
export class SupabaseObjectPersistence implements PersistenceContract {
  private get db() {
    return getSupabaseServerClient()
  }

  async persistObject(
    workspaceId: string,
    object: CanonicalOperationalObject,
  ): Promise<PersistenceResult<string>> {
    if (object.workspaceId !== workspaceId) {
      return {
        ok: false,
        error: `Object workspace '${object.workspaceId}' does not match target workspace '${workspaceId}'`,
        code: 'workspace-mismatch',
      }
    }

    const row = serializeObject(object)
    const { error } = await this.db
      .from('operational_objects')
      .upsert(toDbRow(row), { onConflict: 'id' })

    if (error) {
      return { ok: false, error: error.message, code: 'write-failed' }
    }

    return { ok: true, data: object.id }
  }

  async loadObjects(
    workspaceId: string,
  ): Promise<PersistenceResult<CanonicalOperationalObject[]>> {
    const { data, error } = await this.db
      .from('operational_objects')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('updated_at', { ascending: false })
      .limit(500)

    if (error) {
      return { ok: false, error: error.message, code: 'read-failed' }
    }

    const rows = (data ?? []).map(fromDbRow)
    const objects = deserializeObjectBatch(rows)
    return { ok: true, data: objects }
  }

  async upsertObjects(
    workspaceId: string,
    objects: CanonicalOperationalObject[],
  ): Promise<PersistenceResult<number>> {
    const scoped = objects.filter((o) => o.workspaceId === workspaceId)
    if (scoped.length === 0) return { ok: true, data: 0 }

    // Fetch existing rows for conflict resolution via mergeObjectRows
    const ids = scoped.map((o) => o.id)
    const { data: existing, error: fetchError } = await this.db
      .from('operational_objects')
      .select('*')
      .in('id', ids)

    if (fetchError) {
      return { ok: false, error: fetchError.message, code: 'read-failed' }
    }

    const existingById = new Map<string, CanonicalObjectRow>()
    for (const row of existing ?? []) {
      const mapped = fromDbRow(row)
      if (validateObjectRow(mapped)) {
        existingById.set(mapped.id, mapped as CanonicalObjectRow)
      }
    }

    const rows = serializeObjectBatch(scoped).map((incoming) => {
      const existing = existingById.get(incoming.id)
      return existing ? mergeObjectRows(existing, incoming) : incoming
    })

    const { error } = await this.db
      .from('operational_objects')
      .upsert(rows.map(toDbRow), { onConflict: 'id' })

    if (error) {
      return { ok: false, error: error.message, code: 'write-failed' }
    }

    return { ok: true, data: rows.length }
  }

  async deleteObject(
    workspaceId: string,
    objectId: string,
  ): Promise<PersistenceResult<boolean>> {
    const { error, count } = await this.db
      .from('operational_objects')
      .delete({ count: 'exact' })
      .eq('id', objectId)
      .eq('workspace_id', workspaceId)

    if (error) {
      return { ok: false, error: error.message, code: 'write-failed' }
    }

    return { ok: true, data: (count ?? 0) > 0 }
  }
}

// Maps the canonical row shape to the snake_case column names used in Supabase.
// Only includes columns that exist after the Phase 2 migration.
function toDbRow(row: CanonicalObjectRow): Record<string, unknown> {
  return {
    id: row.id,
    workspace_id: row.workspace_id,
    object_type: row.object_type,
    lineage_id: row.lineage_id,
    status: row.status,
    payload: row.payload,
    created_at: row.created_at,
    updated_at: row.updated_at,
    replay_confirmed: row.replay_confirmed,
    last_confirmed_sequence: row.last_confirmed_sequence,
    augmented_at: row.augmented_at,
    merge_history: row.merge_history,
    provenance: row.provenance,
  }
}

// Maps a raw Supabase response row to the canonical row shape.
function fromDbRow(row: Record<string, unknown>): unknown {
  return {
    id: row.id,
    workspace_id: row.workspace_id,
    object_type: row.object_type,
    lineage_id: row.lineage_id ?? null,
    status: row.status,
    payload: row.payload ?? {},
    created_at: row.created_at,
    updated_at: row.updated_at,
    replay_confirmed: row.replay_confirmed ?? false,
    last_confirmed_sequence: row.last_confirmed_sequence ?? null,
    augmented_at: row.augmented_at ?? null,
    merge_history: row.merge_history ?? null,
    provenance: row.provenance ?? null,
  }
}
