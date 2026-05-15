export type IngestedEntity = {
  id: string
  name: string
  type: 'person' | 'project' | 'system' | 'artifact' | 'thread'
  relatedEntities: string[]
  relatedArtifacts: string[]
  relatedThreads: string[]
}

export function extractIngestionEntities(text: string, artifactId?: string, threadId?: string): IngestedEntity[] {
  const out: IngestedEntity[] = []
  const personMatches = text.match(/\b([A-Z][a-z]+\s[A-Z][a-z]+)\b/g) ?? []
  const projectMatches = text.match(/\b(crusade|flightpath|tourtext|teladex)\b/gi) ?? []
  const systemMatches = text.match(/\b(TELA|AKB|Notion|Pearl Box|Runtime)\b/gi) ?? []

  const push = (name: string, type: IngestedEntity['type']) => {
    const id = `${type}:${name.toLowerCase().replace(/\s+/g, '-')}`
    if (out.some((e) => e.id === id)) return
    out.push({ id, name, type, relatedEntities: [], relatedArtifacts: artifactId ? [artifactId] : [], relatedThreads: threadId ? [threadId] : [] })
  }

  personMatches.slice(0, 8).forEach((n) => push(n, 'person'))
  projectMatches.slice(0, 8).forEach((n) => push(n, 'project'))
  systemMatches.slice(0, 8).forEach((n) => push(n, 'system'))

  return out
}
