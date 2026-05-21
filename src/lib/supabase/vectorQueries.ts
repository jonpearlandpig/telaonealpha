import { getSupabaseConfig, supabaseHeaders } from './server'

export type VectorMatch = {
  id: string
  workspace_id: string
  thread_id?: string
  lineage_id?: string
  entity_refs?: string[]
  unresolved_count?: number
  truth_rank?: number
  authority_level?: string
  created_at: string
  similarity: number
  payload?: string
}

// NOTE: match_operational_memory RPC and operational_memory table do not yet exist.
// Both functions log the attempt and return safe empty results rather than throwing.

export async function queryPgVector(params: {
  workspaceId: string
  embedding: number[]
  matchCount?: number
  threadId?: string
}): Promise<VectorMatch[]> {
  let cfg: { url: string; serviceRoleKey: string }
  try {
    cfg = getSupabaseConfig()
  } catch (err) {
    console.error('[supabase:vectorQueries:queryPgVector] config unavailable:', String(err))
    return []
  }

  const endpoint = `${cfg.url}/rest/v1/rpc/match_operational_memory`
  console.log('[supabase:vectorQueries:queryPgVector] calling RPC', endpoint, 'workspace:', params.workspaceId)

  let res: Response
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: supabaseHeaders(cfg.serviceRoleKey),
      body: JSON.stringify({
        query_embedding: params.embedding,
        match_count: params.matchCount ?? 24,
        workspace_id: params.workspaceId,
        thread_id: params.threadId ?? null,
      }),
      cache: 'no-store',
    })
  } catch (err) {
    console.error('[supabase:vectorQueries:queryPgVector] fetch threw:', String(err))
    return []
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '(unreadable)')
    if (res.status === 404) {
      console.warn('[supabase:vectorQueries:queryPgVector] RPC match_operational_memory does not exist yet (404) — returning []. Body:', body.slice(0, 200))
    } else {
      console.error(`[supabase:vectorQueries:queryPgVector] HTTP ${res.status}:`, body.slice(0, 300))
    }
    return []
  }

  try {
    return await res.json() as VectorMatch[]
  } catch (err) {
    console.error('[supabase:vectorQueries:queryPgVector] failed to parse response:', String(err))
    return []
  }
}

export async function upsertVectorMemoryRow(params: {
  id: string
  workspaceId: string
  embedding: number[]
  payload: string
  threadId?: string
  lineageId?: string
  unresolvedCount?: number
  truthRank?: number
  authorityLevel?: string
  entityRefs?: string[]
}): Promise<void> {
  let cfg: { url: string; serviceRoleKey: string }
  try {
    cfg = getSupabaseConfig()
  } catch (err) {
    console.error('[supabase:vectorQueries:upsertVectorMemoryRow] config unavailable:', String(err))
    return
  }

  const endpoint = `${cfg.url}/rest/v1/operational_memory`
  console.log('[supabase:vectorQueries:upsertVectorMemoryRow] upserting to', endpoint, 'id:', params.id)

  let res: Response
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        ...supabaseHeaders(cfg.serviceRoleKey),
        Prefer: 'resolution=merge-duplicates',
        'On-Conflict': 'id',
      },
      body: JSON.stringify({
        id: params.id,
        workspace_id: params.workspaceId,
        embedding: params.embedding,
        payload: params.payload,
        thread_id: params.threadId,
        lineage_id: params.lineageId,
        unresolved_count: params.unresolvedCount ?? 0,
        truth_rank: params.truthRank ?? 0.7,
        authority_level: params.authorityLevel,
        entity_refs: params.entityRefs ?? [],
        updated_at: new Date().toISOString(),
      }),
      cache: 'no-store',
    })
  } catch (err) {
    console.error('[supabase:vectorQueries:upsertVectorMemoryRow] fetch threw:', String(err))
    return
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '(unreadable)')
    if (res.status === 404 || res.status === 400) {
      console.warn(`[supabase:vectorQueries:upsertVectorMemoryRow] operational_memory table does not exist yet (${res.status}) — skipping. Body:`, body.slice(0, 200))
    } else {
      console.error(`[supabase:vectorQueries:upsertVectorMemoryRow] HTTP ${res.status}:`, body.slice(0, 300))
    }
  } else {
    console.log('[supabase:vectorQueries:upsertVectorMemoryRow] ok, id:', params.id)
  }
}
