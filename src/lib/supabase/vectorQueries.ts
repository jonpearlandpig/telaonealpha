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

export async function queryPgVector(params: {
  workspaceId: string
  embedding: number[]
  matchCount?: number
  threadId?: string
}): Promise<VectorMatch[]> {
  const cfg = getSupabaseConfig()
  const body = {
    query_embedding: params.embedding,
    match_count: params.matchCount ?? 24,
    workspace_id: params.workspaceId,
    thread_id: params.threadId ?? null,
  }
  const res = await fetch(`${cfg.url}/rest/v1/rpc/match_operational_memory`, {
    method: 'POST',
    headers: supabaseHeaders(cfg.serviceRoleKey),
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`vector query failed ${res.status}`)
  return await res.json() as VectorMatch[]
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
  const cfg = getSupabaseConfig()
  const res = await fetch(`${cfg.url}/rest/v1/operational_memory`, {
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
  if (!res.ok) throw new Error(`vector upsert failed ${res.status}`)
}
