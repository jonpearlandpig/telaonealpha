export type ProvenanceRecord = {
  source: string
  lineageId: string
  continuityChain: string[]
  timestamp: string
  authorityConfidence: number
  author?: string
}

export function normalizeTimestamp(input?: string): string {
  const d = input ? new Date(input) : new Date()
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
}

export function createProvenance(params: { source: string; parentLineageId?: string; author?: string; authorityConfidence?: number; continuityChain?: string[]; timestamp?: string }): ProvenanceRecord {
  const timestamp = normalizeTimestamp(params.timestamp)
  const lineageId = params.parentLineageId ?? `lineage_${Math.abs(timestamp.split('').reduce((a, c) => a + c.charCodeAt(0), 0)).toString(36)}`
  return {
    source: params.source,
    lineageId,
    continuityChain: params.continuityChain ?? [lineageId],
    timestamp,
    authorityConfidence: params.authorityConfidence ?? 0.7,
    author: params.author,
  }
}
