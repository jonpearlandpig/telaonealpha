import 'server-only'

import { getSupabaseServerClient } from '@/lib/supabase/server'
import type { RuntimeEventRow } from '@/lib/supabase/schema'
import type { RuntimeEvent, RuntimeEventStoreResult } from './runtimeTypes'

type RuntimeEventDbRow = {
  id: string
  type: string
  event_version: number
  schema_version: string
  source: RuntimeEventRow['source']
  governance_state: string
  execution_state: string
  trace_id: string | null
  correlation_id: string | null
  lineage_id: string | null
  payload_type: string | null
  payload: RuntimeEvent['payload'] | null
  created_at: string
}

function toRuntimeEvent(row: RuntimeEventDbRow): RuntimeEvent {
  return {
    id: row.id,
    type: row.type,
    eventVersion: row.event_version,
    schemaVersion: row.schema_version,
    source: row.source,
    governanceState: row.governance_state,
    executionState: row.execution_state,
    traceId: row.trace_id ?? undefined,
    correlationId: row.correlation_id ?? undefined,
    lineageId: row.lineage_id ?? undefined,
    payloadType: row.payload_type ?? undefined,
    payload: row.payload ?? undefined,
    createdAt: row.created_at,
  }
}

function fromRuntimeEvent(event: RuntimeEvent): RuntimeEventDbRow {
  return {
    id: event.id,
    type: event.type,
    event_version: event.eventVersion,
    schema_version: event.schemaVersion,
    source: event.source,
    governance_state: event.governanceState,
    execution_state: event.executionState,
    trace_id: event.traceId ?? null,
    correlation_id: event.correlationId ?? null,
    lineage_id: event.lineageId ?? null,
    payload_type: event.payloadType ?? null,
    payload: event.payload ?? null,
    created_at: event.createdAt,
  }
}

function safePersistenceError(scope: string, error: unknown, event?: RuntimeEvent) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[runtime:eventStore:${scope}]`, {
    message,
    eventId: event?.id,
    type: event?.type,
    traceId: event?.traceId,
    lineageId: event?.lineageId,
  })
}

export async function persistRuntimeEvent(event: RuntimeEvent): Promise<RuntimeEventStoreResult> {
  try {
    const supabase = getSupabaseServerClient()
    const { error } = await supabase.from('runtime_events').insert(fromRuntimeEvent(event))
    if (error) {
      safePersistenceError('persist', new Error(error.message), event)
      return { persisted: false, eventId: event.id, error: error.message }
    }
    return { persisted: true, eventId: event.id }
  } catch (error) {
    safePersistenceError('persist', error, event)
    return {
      persisted: false,
      eventId: event.id,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export async function getRecentEvents(limit = 50): Promise<RuntimeEvent[]> {
  try {
    const supabase = getSupabaseServerClient()
    const { data, error } = await supabase
      .from('runtime_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw new Error(error.message)
    return ((data ?? []) as RuntimeEventDbRow[]).map(toRuntimeEvent)
  } catch (error) {
    safePersistenceError('recent', error)
    return []
  }
}

export async function getEventsByTraceId(traceId: string): Promise<RuntimeEvent[]> {
  try {
    const supabase = getSupabaseServerClient()
    const { data, error } = await supabase
      .from('runtime_events')
      .select('*')
      .eq('trace_id', traceId)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })

    if (error) throw new Error(error.message)
    return ((data ?? []) as RuntimeEventDbRow[]).map(toRuntimeEvent)
  } catch (error) {
    safePersistenceError('trace', error)
    return []
  }
}

export async function getEventsByLineageId(lineageId: string): Promise<RuntimeEvent[]> {
  try {
    const supabase = getSupabaseServerClient()
    const { data, error } = await supabase
      .from('runtime_events')
      .select('*')
      .eq('lineage_id', lineageId)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })

    if (error) throw new Error(error.message)
    return ((data ?? []) as RuntimeEventDbRow[]).map(toRuntimeEvent)
  } catch (error) {
    safePersistenceError('lineage', error)
    return []
  }
}
