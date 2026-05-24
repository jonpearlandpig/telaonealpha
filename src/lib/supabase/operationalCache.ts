import { getSupabaseServerClient } from './server'
import { SHOWTELA_SNAPSHOT_ID, SHOWTELA_WORKSPACE_ID } from '@/lib/showtela/runtimeContinuity'
import type { ShowTelaHomeData } from '@/lib/showtela/types'

// Legacy fixture IDs from mockData.ts. Guards against stale demo snapshots in Supabase.
// IDs are long-form prefixed (e.g. 'showtela-person-abc123') in live data; single-word ids
// like these only appeared in the old mock fixture. Remove once caches are fully flushed.
const DEMO_PERSON_IDS = new Set(['mock-jon', 'mock-juan', 'mock-mags'])
const DEMO_EVENT_IDS = new Set(['mock-e1', 'mock-e2'])

function provenance(id: string, sourceType: 'notion' | 'supabase' = 'notion') {
  const now = new Date().toISOString()
  return { sourceType, sourceId: id, truthRank: 0.9, lineageRefs: [id], createdAt: now, updatedAt: now }
}

function row(id: string, threadId: string, payload: unknown, sourceType: 'notion' | 'supabase' = 'notion') {
  const now = new Date().toISOString()
  return {
    id,
    workspace_id: SHOWTELA_WORKSPACE_ID,
    thread_id: threadId,
    payload: JSON.stringify(payload),
    created_at: now,
    updated_at: now,
    provenance: provenance(id, sourceType),
  }
}

export function getShowTelaCacheSchemaCompatibility() {
  return {
    table: 'durable_artifacts',
    compatible: true,
    requiredColumns: ['id', 'workspace_id', 'thread_id', 'payload', 'created_at', 'updated_at', 'provenance'],
    optionalColumns: ['file_name', 'mime_type', 'lineage_id', 'artifact_group_id'],
    rowShape: row(SHOWTELA_SNAPSHOT_ID, 'showtela-home', { activeOps: [], operations: [], continuityFeed: [] }),
  }
}

export async function readShowTelaCache(): Promise<ShowTelaHomeData | null> {
  const db = getSupabaseServerClient()
  console.log('[TELA:TRACE] readShowTelaCache querying id:', SHOWTELA_SNAPSHOT_ID, 'workspace:', SHOWTELA_WORKSPACE_ID)
  const { data, error } = await db
    .from('durable_artifacts')
    .select('payload')
    .eq('id', SHOWTELA_SNAPSHOT_ID)
    .eq('workspace_id', SHOWTELA_WORKSPACE_ID)
    .single()
  if (error) {
    console.error('[TELA:TRACE] readShowTelaCache query failed — code:', error.code, 'message:', error.message)
    return null
  }
  if (!data?.payload) {
    console.warn('[TELA:TRACE] readShowTelaCache row found but payload is empty')
    return null
  }
  try {
    const parsed = JSON.parse(data.payload) as ShowTelaHomeData
    const source = (parsed as { source?: string }).source
    const hasDemoPerson = parsed.activeOps?.some((p) => DEMO_PERSON_IDS.has(p.id))
    const hasDemoEvent = parsed.continuityFeed?.some((e) => DEMO_EVENT_IDS.has(e.id))
    console.log('[TELA:TRACE] readShowTelaCache parsed snapshot', {
      source,
      diagnosticState: (parsed as { diagnosticState?: string }).diagnosticState ?? null,
      activeOpsCount: parsed.activeOps?.length ?? 0,
      operationsCount: parsed.operations?.length ?? 0,
      feedCount: parsed.continuityFeed?.length ?? 0,
      hasDemoPerson,
      hasDemoEvent,
    })
    if ((source && source !== 'notion' && source !== 'supabase') || hasDemoPerson || hasDemoEvent) {
      console.warn('[TELA:TRACE] readShowTelaCache discarding legacy snapshot — source:', source)
      return null
    }
    return parsed
  } catch {
    console.error('[TELA:TRACE] readShowTelaCache payload is not valid JSON')
    return null
  }
}

export async function writeShowTelaCache(data: ShowTelaHomeData): Promise<void> {
  const db = getSupabaseServerClient()
  const src: 'notion' | 'supabase' = data.source === 'supabase' ? 'supabase' : 'notion'
  const now = new Date().toISOString()
  const payloadStr = JSON.stringify({ ...data, source: src })

  // Step 1: UPDATE if a snapshot row already exists.
  // PostgREST UPDATE returns [] (not an error) when 0 rows match — safe to check length.
  const { data: updated, error: updateError } = await db
    .from('durable_artifacts')
    .update({ payload: payloadStr, updated_at: now })
    .eq('id', SHOWTELA_SNAPSHOT_ID)
    .eq('workspace_id', SHOWTELA_WORKSPACE_ID)
    .select('id')

  if (!updateError && updated && updated.length > 0) {
    console.log('[TELA:TRACE] writeShowTelaCache UPDATE succeeded — snapshot overwritten')
    return
  }

  if (updateError) {
    console.warn('[TELA:TRACE] writeShowTelaCache UPDATE failed — falling through to INSERT:', updateError.message, '| code:', updateError.code)
  } else {
    console.log('[TELA:TRACE] writeShowTelaCache UPDATE matched 0 rows — no existing snapshot, inserting')
  }

  // Step 2: INSERT the snapshot row (first write).
  // provenance is JSON-stringified so it is compatible with both text and jsonb column types.
  const provenanceStr = JSON.stringify({
    sourceType: src,
    sourceId: SHOWTELA_SNAPSHOT_ID,
    truthRank: 0.9,
    lineageRefs: [SHOWTELA_SNAPSHOT_ID],
    createdAt: now,
    updatedAt: now,
  })

  const { error: insertError } = await db
    .from('durable_artifacts')
    .insert([{
      id: SHOWTELA_SNAPSHOT_ID,
      workspace_id: SHOWTELA_WORKSPACE_ID,
      thread_id: 'showtela-home',
      payload: payloadStr,
      created_at: now,
      updated_at: now,
      provenance: provenanceStr,
    }])

  if (insertError) {
    console.error('[TELA:TRACE] writeShowTelaCache INSERT failed', {
      code: insertError.code,
      message: insertError.message,
      details: (insertError as { details?: string }).details ?? null,
      hint: (insertError as { hint?: string }).hint ?? null,
    })
    throw new Error(`writeShowTelaCache: ${insertError.message} [${insertError.code}]`)
  }

  console.log('[TELA:TRACE] writeShowTelaCache INSERT succeeded — activeOps:', data.activeOps.length, 'ops:', data.operations.length)
}
