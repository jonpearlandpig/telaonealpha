export type RetrievalTrace = {
  trigger: string
  scopes: string[]
  topIds: string[]
  matchedSignals: string[]
  conflictResolution: string[]
  confidence: number
  canonicalOverrides: string[]
  unresolvedInfluence: number
}

export function createTrace(input: Partial<RetrievalTrace>): RetrievalTrace {
  return {
    trigger: input.trigger ?? 'continuity-retrieval',
    scopes: input.scopes ?? [],
    topIds: input.topIds ?? [],
    matchedSignals: input.matchedSignals ?? [],
    conflictResolution: input.conflictResolution ?? [],
    confidence: input.confidence ?? 0,
    canonicalOverrides: input.canonicalOverrides ?? [],
    unresolvedInfluence: input.unresolvedInfluence ?? 0,
  }
}
