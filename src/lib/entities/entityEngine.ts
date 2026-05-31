import type { ArtifactRecord } from '@/lib/artifacts/artifactStore'

export type EntityType = 'person' | 'project' | 'organization' | 'system' | 'location' | 'ip' | 'context' | 'operation' | 'venue'
export type AuthoritySource = 'anchor-directory' | 'owner' | 'manual' | 'verified' | 'document' | 'llm' | 'regex' | 'tentative'

// Person entities are sovereign data. Only explicitly authorized sources may create them.
// regex and llm are excluded — they produce venue names, department names, and stopword fragments.
export const PERSON_AUTHORITY_ALLOWED = new Set<AuthoritySource>([
  'anchor-directory', 'owner', 'manual', 'verified',
])

export function isAuthorizedPersonEntity(entity: EntityRecord): boolean {
  if (entity.type !== 'person') return true
  return PERSON_AUTHORITY_ALLOWED.has(entity.authoritySource as AuthoritySource)
}
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
  // person pattern intentionally absent — regex has no authority to classify people.
  // Person entities may only be created by anchorDirectoryExtractor, owner fields, or manual authorship.
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
