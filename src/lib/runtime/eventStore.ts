import 'server-only'

import { getSupabaseServerClient } from '@/lib/supabase/server'
import type { RuntimeEventRow } from '@/lib/supabase/schema'
import {
  isExecutionState,
  isGovernanceState,
  type ExecutionState,
  type GovernanceState,
  type RuntimeEvent,
  type RuntimeEventStoreResult,
} from './runtimeTypes'

type RuntimeEventDbRow = {
  id: string
  workspace_id: string
  replay_sequence: number
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

function normalizeGovernanceState(value: string): GovernanceState {
  if (isGovernanceState(value)) return value
  if (value === 'constitutional' || value === 'validated' || value === 'review') return 'approved'
  if (value === 'immutable') return 'escalated'
  if (value === 'exploratory') return 'pending'
  return 'pending'
}

function normalizeExecutionState(value: string): ExecutionState {
  if (isExecutionState(value)) return value
  if (value === 'rolled_back' || value === 'rejected') return 'rolled-back'
  if (value === 'active') return 'queued'
  return value === 'completed' ? 'completed' : 'failed'
}

function toRuntimeEvent(row: RuntimeEventDbRow): RuntimeEvent {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    replaySequence: row.replay_sequence,
    type: row.type,
    eventVersion: row.event_version,
    schemaVersion: row.schema_version,
    source: row.source,
    governanceState: normalizeGovernanceState(row.governance_state),
    executionState: normalizeExecutionState(row.execution_state),
    traceId: row.trace_id ?? undefined,
    correlationId: row.correlation_id ?? undefined,
    lineageId: row.lineage_id ?? undefined,
    payloadType: row.payload_type ?? undefined,
    payload: row.payload ?? undefined,
    createdAt: row.created_at,
  }
}

function fromRuntimeEvent(event: RuntimeEvent): RuntimeEventDbRow {
  if (!event.workspaceId?.trim()) {
    throw new Error(`Runtime event ${event.id} (${event.type}) is missing workspaceId`)
  }

  return {
    id: event.id,
    workspace_id: event.workspaceId,
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
    replay_sequence: event.replaySequence ?? 0,
  }
}

function toRuntimeEventInsert(event: RuntimeEvent): Omit<RuntimeEventDbRow, 'replay_sequence'> {
  const row = fromRuntimeEvent(event)
  return {
    id: row.id,
    workspace_id: row.workspace_id,
    type: row.type,
    event_version: row.event_version,
    schema_version: row.schema_version,
    source: row.source,
    governance_state: row.governance_state,
    execution_state: row.execution_state,
    trace_id: row.trace_id,
    correlation_id: row.correlation_id,
    lineage_id: row.lineage_id,
    payload_type: row.payload_type,
    payload: row.payload,
    created_at: row.created_at,
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
  if (!event.workspaceId?.trim()) {
    const error = new Error(`Runtime event ${event.id} (${event.type}) rejected: workspaceId is required`)
    safePersistenceError('persist', error, event)
    throw error
  }

  try {
    const supabase = getSupabaseServerClient()
    const { error } = await supabase.from('runtime_events').insert(toRuntimeEventInsert(event))
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

export async function getReplayEventsForWorkspacePage(params: {
  workspaceId: string
  afterReplaySequence?: number
  limit?: number
}): Promise<RuntimeEvent[]> {
  try {
    const supabase = getSupabaseServerClient()
    let query = supabase
      .from('runtime_events')
      .select('*')
      .eq('workspace_id', params.workspaceId)
      .order('replay_sequence', { ascending: true })
      .limit(params.limit ?? 500)

    if (typeof params.afterReplaySequence === 'number') {
      query = query.gt('replay_sequence', params.afterReplaySequence)
    }

    const { data, error } = await query

    if (error) throw new Error(error.message)
    return ((data ?? []) as RuntimeEventDbRow[]).map(toRuntimeEvent)
  } catch (error) {
    safePersistenceError('workspace', error)
    return []
  }
}

export async function getAllReplayEventsForWorkspace(workspaceId: string): Promise<RuntimeEvent[]> {
  const events: RuntimeEvent[] = []
  let afterReplaySequence: number | undefined

  while (true) {
    const page = await getReplayEventsForWorkspacePage({
      workspaceId,
      afterReplaySequence,
      limit: 500,
    })
    if (page.length === 0) break
    events.push(...page)
    afterReplaySequence = page.at(-1)?.replaySequence
    if (page.length < 500) break
  }

  return events
}

export async function getEventsByTraceId(traceId: string): Promise<RuntimeEvent[]> {
  try {
    const supabase = getSupabaseServerClient()
    const { data, error } = await supabase
      .from('runtime_events')
      .select('*')
      .eq('trace_id', traceId)
      .order('replay_sequence', { ascending: true })

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
      .order('replay_sequence', { ascending: true })

    if (error) throw new Error(error.message)
    return ((data ?? []) as RuntimeEventDbRow[]).map(toRuntimeEvent)
  } catch (error) {
    safePersistenceError('lineage', error)
    return []
  }
}
