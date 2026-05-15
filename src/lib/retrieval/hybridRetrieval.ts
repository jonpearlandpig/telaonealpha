import { runVectorSearch } from './vectorSearch'
import { blendContinuityScore } from './continuityBlender'
import { resolveCanonicalOrder } from './canonicalResolver'
import { createTrace, type RetrievalTrace } from './retrievalTrace'

export type HybridResult = { id: string; score: number; payload?: string; trace: RetrievalTrace }

export async function runHybridRetrieval(params: {
  workspaceId: string
  query: string
  threadId: string
  lineageId?: string
  entityRefs?: string[]
  unresolvedBias?: number
}): Promise<HybridResult[]> {
  const matches = await runVectorSearch(params.workspaceId, params.query, params.threadId)
  const ranked = matches.map((m) => {
    const recencyHours = (Date.now() - new Date(m.created_at).getTime()) / 3600000
    const entityOverlap = (m.entity_refs ?? []).filter((e) => (params.entityRefs ?? []).includes(e)).length
    const score = blendContinuityScore(m, {
      sameThread: m.thread_id === params.threadId,
      lineageHit: Boolean(params.lineageId && m.lineage_id === params.lineageId),
      entityOverlap,
      unresolvedBias: params.unresolvedBias ?? 0,
      recencyHours,
    })
    return { id: m.id, score, truthRank: m.truth_rank ?? 0, pinned: m.authority_level === 'pinned', unresolvedCount: m.unresolved_count ?? 0, authorityLevel: m.authority_level, payload: m.payload }
  })

  const canonical = resolveCanonicalOrder(ranked)
  const top = canonical.slice(0, 12)
  return top.map((row) => ({
    id: row.id,
    score: row.score,
    payload: row.payload,
    trace: createTrace({
      trigger: 'hybrid-retrieval',
      scopes: ['canonical', 'unresolved', 'operational', 'lineage', 'provenance', 'semantic'],
      topIds: top.map((r) => r.id),
      matchedSignals: ['continuity', 'semantic', 'canonical-truth'],
      confidence: Math.min(1, row.score / 180),
      unresolvedInfluence: row.unresolvedCount ?? 0,
      canonicalOverrides: row.authorityLevel ? [row.authorityLevel] : [],
      conflictResolution: ['canonical hierarchy applied'],
    }),
  }))
}
