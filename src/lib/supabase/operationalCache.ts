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
  const snapshotRow = row(SHOWTELA_SNAPSHOT_ID, 'showtela-home', data, src)

  const payloadJson = snapshotRow.payload
  console.log('[TELA:TRACE] writeShowTelaCache PRE-INSERT row', {
    rowKeys: Object.keys(snapshotRow),
    id: snapshotRow.id,
    workspace_id: snapshotRow.workspace_id,
    thread_id: snapshotRow.thread_id,
    typeof_payload: typeof snapshotRow.payload,
    payloadByteLength: payloadJson?.length ?? 0,
    payloadSourceField: (() => { try { return (JSON.parse(payloadJson ?? '') as { source?: string }).source } catch { return 'PARSE_ERROR' } })(),
    typeof_provenance: typeof snapshotRow.provenance,
    provenanceKeys: Object.keys(snapshotRow.provenance ?? {}),
    provenanceSourceType: (snapshotRow.provenance as { sourceType?: string })?.sourceType ?? null,
    created_at: snapshotRow.created_at,
    updated_at: snapshotRow.updated_at,
  })

  // Delete any existing snapshot row so the subsequent insert never hits a duplicate key.
  const { error: deleteError } = await db
    .from('durable_artifacts')
    .delete()
    .eq('id', SHOWTELA_SNAPSHOT_ID)
    .eq('workspace_id', SHOWTELA_WORKSPACE_ID)

  if (deleteError) {
    console.error('[TELA:TRACE] writeShowTelaCache DELETE failed', {
      code: deleteError.code,
      message: deleteError.message,
      details: (deleteError as { details?: string }).details ?? null,
      hint: (deleteError as { hint?: string }).hint ?? null,
    })
  } else {
    console.log('[TELA:TRACE] writeShowTelaCache DELETE OK (pre-insert clear)')
  }

  const { data: insertData, error } = await db
    .from('durable_artifacts')
    .insert([snapshotRow])
    .select('id, workspace_id')

  console.log('[TELA:TRACE] writeShowTelaCache INSERT response', {
    insertDataRows: insertData?.length ?? null,
    insertDataFirst: insertData?.[0] ?? null,
    errorCode: error?.code ?? null,
    errorMessage: error?.message ?? null,
    errorDetails: (error as { details?: string } | null)?.details ?? null,
    errorHint: (error as { hint?: string } | null)?.hint ?? null,
  })

  if (error) {
    throw new Error(`writeShowTelaCache: ${error.message}`)
  }

  // Verify row visibility immediately after insert — rules out RLS-invisible writes.
  const { data: verifyData, error: verifyError } = await db
    .from('durable_artifacts')
    .select('*')
    .eq('id', SHOWTELA_SNAPSHOT_ID)
    .eq('workspace_id', SHOWTELA_WORKSPACE_ID)
    .single()

  const verifyRow = verifyData as Record<string, unknown> | null
  console.log('[TELA:TRACE] writeShowTelaCache POST-INSERT SELECT verify', {
    found: !!verifyRow,
    returnedKeys: verifyRow ? Object.keys(verifyRow) : null,
    id: verifyRow?.id ?? null,
    workspace_id: verifyRow?.workspace_id ?? null,
    payloadLength: typeof verifyRow?.payload === 'string' ? (verifyRow.payload as string).length : null,
    verifyErrorCode: verifyError?.code ?? null,
    verifyErrorMessage: verifyError?.message ?? null,
  })

  console.log('[TELA:TRACE] writeShowTelaCache snapshot written OK — activeOps:', data.activeOps.length, 'ops:', data.operations.length)
}
