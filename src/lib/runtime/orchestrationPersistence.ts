import 'server-only'

import { getSupabaseServerClient } from '@/lib/supabase/server'
import type { RuntimeEvent } from './runtimeTypes'
import { buildPersistenceMutationsForEvent } from './persistenceDerivations'

function safePersistenceError(scope: string, error: unknown, event: RuntimeEvent) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[runtime:orchestrationPersistence:${scope}]`, {
    message,
    eventId: event.id,
    type: event.type,
    traceId: event.traceId,
    lineageId: event.lineageId,
  })
}

export async function persistRuntimeDerivations(event: RuntimeEvent) {
  const mutations = buildPersistenceMutationsForEvent(event)
  const db = getSupabaseServerClient()

  try {
    if (mutations.operationalObjects.length > 0) {
      const { error } = await db.from('operational_objects').upsert(
        mutations.operationalObjects.map((item) => ({
          id: item.id,
          object_type: item.objectType,
          lineage_id: item.lineageId ?? null,
          status: item.status,
          payload: item.payload,
          created_at: item.createdAt,
          updated_at: item.updatedAt,
        })),
        { onConflict: 'id' },
      )
      if (error) throw new Error(error.message)
    }

    if (mutations.routingPlans.length > 0) {
      const { error } = await db.from('routing_plans').upsert(
        mutations.routingPlans.map((item) => ({
          id: item.id,
          action: item.action,
          governance_state: item.governanceState,
          selected_operators: item.selectedOperators,
          sequence: item.sequence,
          rollback_class: item.rollbackClass,
          escalation_path: item.escalationPath,
          created_at: item.createdAt,
        })),
        { onConflict: 'id' },
      )
      if (error) throw new Error(error.message)
    }

    if (mutations.enforcementActions.length > 0) {
      const { error } = await db.from('enforcement_actions').upsert(
        mutations.enforcementActions.map((item) => ({
          id: item.id,
          event_id: item.eventId ?? null,
          action: item.action,
          decision: item.decision,
          reason: item.reason ?? null,
          created_at: item.createdAt,
        })),
        { onConflict: 'id' },
      )
      if (error) throw new Error(error.message)
    }

    if (mutations.lineageGraph.length > 0) {
      const { error } = await db.from('lineage_graph').upsert(
        mutations.lineageGraph.map((item) => ({
          id: item.id,
          lineage_id: item.lineageId,
          parent_lineage_id: item.parentLineageId ?? null,
          event_id: item.eventId ?? null,
          relation_type: item.relationType,
          created_at: item.createdAt,
        })),
        { onConflict: 'id' },
      )
      if (error) throw new Error(error.message)
    }
  } catch (error) {
    safePersistenceError('persist', error, event)
  }
}
