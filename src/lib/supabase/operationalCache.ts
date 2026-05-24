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
  const { data, error } = await db
    .from('durable_artifacts')
    .select('payload')
    .eq('id', SHOWTELA_SNAPSHOT_ID)
    .eq('workspace_id', SHOWTELA_WORKSPACE_ID)
    .single()
  if (error) {
    console.error('[operationalCache] Supabase snapshot read failed:', error.message)
    return null
  }
  if (!data?.payload) {
    console.warn('[operationalCache] Supabase snapshot empty')
    return null
  }
  try {
    const parsed = JSON.parse(data.payload) as ShowTelaHomeData
    const source = (parsed as { source?: string }).source
    const hasDemoPerson = parsed.activeOps?.some((p) => DEMO_PERSON_IDS.has(p.id))
    const hasDemoEvent = parsed.continuityFeed?.some((e) => DEMO_EVENT_IDS.has(e.id))
    if ((source && source !== 'notion' && source !== 'supabase') || hasDemoPerson || hasDemoEvent) {
      console.warn('[operationalCache] cached snapshot contains legacy demo data — discarding')
      return null
    }
    return parsed
  } catch {
    console.error('[operationalCache] Supabase snapshot payload is not valid JSON')
    return null
  }
}

export async function writeShowTelaCache(data: ShowTelaHomeData): Promise<void> {
  const db = getSupabaseServerClient()
  const src: 'notion' | 'supabase' = data.source === 'supabase' ? 'supabase' : 'notion'

  const rows = [
    ...data.activeOps.map(p => row(`showtela-person-${p.id}`, 'showtela-people', p, src)),
    ...data.fluencyPartners.map(p => row(`showtela-partner-${p.id}`, 'showtela-people', p, src)),
    ...data.operations.map(o => row(`showtela-op-${o.id}`, 'showtela-operations', o, src)),
    ...data.unresolved.map(u => row(`showtela-unresolved-${u.id}`, 'showtela-unresolved', u, src)),
    ...data.continuityFeed.slice(0, 50).map(e => row(`showtela-event-${e.id}`, 'showtela-events', e, src)),
    row(SHOWTELA_SNAPSHOT_ID, 'showtela-home', data, src),
  ]

  const { error } = await db
    .from('durable_artifacts')
    .insert(rows)

  if (error) {
    console.error('[operationalCache] Supabase snapshot write failed:', error.message, '| code:', error.code)
    throw new Error(`writeShowTelaCache: ${error.message}`)
  }

  console.log(`[operationalCache] wrote ${rows.length} rows (snapshot + ${data.continuityFeed.slice(0, 50).length} events, ${data.activeOps.length + data.fluencyPartners.length} people, ${data.operations.length} ops, ${data.unresolved.length} unresolved)`)
}
