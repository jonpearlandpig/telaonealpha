import type { ArtifactRecord } from '@/lib/artifacts/artifactStore'

export type EntityType = 'person' | 'project' | 'operation' | 'organization' | 'system' | 'location' | 'venue' | 'ip' | 'context'
export type AuthoritySource = 'anchor-directory' | 'owner' | 'document' | 'regex' | 'tentative' | string

export type EntityRecord = {
  id: string
  name: string
  type: EntityType
  aliases: string[]
  firstSeen: string
  lastSeen: string
  linkedArtifacts: string[]
  linkedThreads: string[]
  operationalContexts: string[]
  continuityCount: number
  unresolvedLinks: number
  relatedArtifacts: string[]
  relatedThreads: string[]
  temporalClusters: string[]
  trustRank?: number
  authoritySource?: AuthoritySource
}

const PATTERNS: Array<{ type: EntityType; regex: RegExp }> = [
  { type: 'ip', regex: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g },
  { type: 'location', regex: /\b(?:Austin|Nashville|New York|San Francisco|London|Tokyo)\b/gi },
  { type: 'system', regex: /\b(?:TELA|AKB|Pearl Box|Notion|Runtime|ContinuityMap)\b/gi },
  { type: 'organization', regex: /\b(?:OpenAI|Google|Microsoft|Vercel)\b/gi },
  { type: 'project', regex: /\b(?:flightpath|tourtext|teladex|crusade)\b/gi },
  { type: 'person', regex: /\b([A-Z][a-z]+\s[A-Z][a-z]+)\b/g },
  { type: 'context', regex: /\b(?:deployment|handoff|review|timeline|export|incident)\b/gi },
]

export function extractEntities(text: string, artifact: ArtifactRecord): EntityRecord[] {
  const now = new Date().toISOString()
  const out: EntityRecord[] = []
  for (const p of PATTERNS) {
    const matches = text.match(p.regex) ?? []
    for (const m of matches.slice(0, 8)) {
      const name = m.trim()
      if (!name) continue
      const id = `${p.type}:${name.toLowerCase().replace(/\s+/g, '-')}`
      if (out.some((e) => e.id === id)) continue
      out.push({
        id,
        name,
        type: p.type,
        aliases: [],
        firstSeen: now,
        lastSeen: now,
        linkedArtifacts: [artifact.id],
        linkedThreads: [artifact.threadId],
        operationalContexts: [artifact.sessionId],
        continuityCount: 1,
        unresolvedLinks: /todo|unresolved|follow-up|pending|waiting/i.test(text) ? 1 : 0,
        relatedArtifacts: [artifact.id],
        relatedThreads: [artifact.threadId],
        temporalClusters: [now.slice(0, 10)],
      })
    }
  }
  return out
}
