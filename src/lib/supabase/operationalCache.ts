import { getSupabaseServerClient } from './server'
import type { ShowTelaHomeData } from '@/lib/showtela/types'

const WORKSPACE = 'tela-showtela'
const SNAPSHOT_ID = 'showtela-home-snapshot'

function provenance(id: string) {
  const now = new Date().toISOString()
  return { sourceType: 'notion', sourceId: id, truthRank: 0.9, lineageRefs: [id], createdAt: now, updatedAt: now }
}

function row(id: string, threadId: string, payload: unknown) {
  const now = new Date().toISOString()
  return {
    id,
    workspace_id: WORKSPACE,
    thread_id: threadId,
    payload: JSON.stringify(payload),
    created_at: now,
    updated_at: now,
    provenance: provenance(id),
  }
}

export async function readShowTelaCache(): Promise<ShowTelaHomeData | null> {
  const db = getSupabaseServerClient()
  const { data, error } = await db
    .from('durable_artifacts')
    .select('payload')
    .eq('id', SNAPSHOT_ID)
    .eq('workspace_id', WORKSPACE)
    .single()
  if (error || !data?.payload) return null
  try {
    return JSON.parse(data.payload) as ShowTelaHomeData
  } catch {
    return null
  }
}

export async function writeShowTelaCache(data: ShowTelaHomeData): Promise<void> {
  const db = getSupabaseServerClient()

  const rows = [
    ...data.activeOps.map(p => row(`showtela-person-${p.id}`, 'showtela-people', p)),
    ...data.fluencyPartners.map(p => row(`showtela-partner-${p.id}`, 'showtela-people', p)),
    ...data.operations.map(o => row(`showtela-op-${o.id}`, 'showtela-operations', o)),
    ...data.unresolved.map(u => row(`showtela-unresolved-${u.id}`, 'showtela-unresolved', u)),
    ...data.continuityFeed.slice(0, 50).map(e => row(`showtela-event-${e.id}`, 'showtela-events', e)),
    row(SNAPSHOT_ID, 'showtela-home', data),
  ]

  const { error } = await db
    .from('durable_artifacts')
    .upsert(rows, { onConflict: 'id' })

  if (error) throw new Error(`writeShowTelaCache: ${error.message}`)

  console.log(`[operationalCache] wrote ${rows.length} rows (snapshot + ${data.continuityFeed.slice(0, 50).length} events, ${data.activeOps.length + data.fluencyPartners.length} people, ${data.operations.length} ops, ${data.unresolved.length} unresolved)`)
}
