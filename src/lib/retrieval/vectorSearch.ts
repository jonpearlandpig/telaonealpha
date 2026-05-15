import { queryPgVector, type VectorMatch } from '@/lib/supabase/vectorQueries'

function cheapEmbedding(query: string): number[] {
  const out = new Array<number>(64).fill(0)
  for (let i = 0; i < query.length; i++) out[i % out.length] += (query.charCodeAt(i) % 31) / 31
  return out
}

export async function runVectorSearch(workspaceId: string, query: string, threadId?: string): Promise<VectorMatch[]> {
  const embedding = cheapEmbedding(query)
  return queryPgVector({ workspaceId, embedding, threadId, matchCount: 32 })
}
