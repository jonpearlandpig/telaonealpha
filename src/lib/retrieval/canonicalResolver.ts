export type RankedMemory = {
  id: string
  score: number
  truthRank: number
  payload?: string
  pinned?: boolean
  unresolvedCount?: number
  authorityLevel?: string
}

export function resolveCanonicalOrder(rows: RankedMemory[]): RankedMemory[] {
  return [...rows].sort((a, b) => {
    if (b.truthRank !== a.truthRank) return b.truthRank - a.truthRank
    if (Boolean(b.pinned) !== Boolean(a.pinned)) return Number(Boolean(b.pinned)) - Number(Boolean(a.pinned))
    if ((b.unresolvedCount ?? 0) !== (a.unresolvedCount ?? 0)) return (b.unresolvedCount ?? 0) - (a.unresolvedCount ?? 0)
    if ((b.authorityLevel === 'canonical') !== (a.authorityLevel === 'canonical')) return Number(b.authorityLevel === 'canonical') - Number(a.authorityLevel === 'canonical')
    return b.score - a.score
  })
}
