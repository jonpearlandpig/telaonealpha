import type { VectorMatch } from '@/lib/supabase/vectorQueries'

export function blendContinuityScore(match: VectorMatch, input: { sameThread: boolean; lineageHit: boolean; entityOverlap: number; unresolvedBias: number; recencyHours: number }): number {
  const canonicalTruth = (match.truth_rank ?? 0.5) * 100
  const unresolved = (match.unresolved_count ?? 0) * 12 + input.unresolvedBias
  const operational = input.sameThread ? 32 : 0
  const lineage = input.lineageHit ? 24 : 0
  const provenance = (match.authority_level === 'canonical' ? 18 : 8)
  const semantic = (match.similarity ?? 0) * 10
  const temporal = Math.max(0, 12 - input.recencyHours / 8)
  const entity = input.entityOverlap * 6
  return canonicalTruth + unresolved + operational + lineage + provenance + temporal + entity + semantic
}
