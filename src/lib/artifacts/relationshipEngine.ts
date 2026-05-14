import type { ArtifactRecord } from './artifactStore'

export type RelationshipEdge = { from: string; to: string; weight: number; reasons: string[] }

const overlap = (a: string[], b: string[]) => a.filter((x) => b.includes(x)).length

export function inferRelationships(artifacts: ArtifactRecord[]): RelationshipEdge[] {
  const edges: RelationshipEdge[] = []
  for (let i = 0; i < artifacts.length; i++) {
    for (let j = i + 1; j < artifacts.length; j++) {
      const a = artifacts[i]
      const b = artifacts[j]
      let weight = 0
      const reasons: string[] = []

      if (a.title.toLowerCase() === b.title.toLowerCase()) { weight += 2; reasons.push('title') }
      if (a.prompt && b.prompt && a.prompt.slice(0, 32) === b.prompt.slice(0, 32)) { weight += 2; reasons.push('prompt') }
      if (a.lineageId && a.lineageId === b.lineageId) { weight += 3; reasons.push('lineage') }
      if (a.threadId === b.threadId || a.sessionId === b.sessionId) { weight += 1.5; reasons.push('session') }
      const entityHits = overlap(a.entities ?? [], b.entities ?? [])
      if (entityHits) { weight += entityHits; reasons.push('entities') }
      const projectHits = overlap(a.projects ?? [], b.projects ?? [])
      if (projectHits) { weight += projectHits; reasons.push('projects') }

      const tA = new Date(a.createdAt).getTime(); const tB = new Date(b.createdAt).getTime()
      if (Math.abs(tA - tB) < 1000 * 60 * 45) { weight += 1; reasons.push('temporal') }

      if (weight >= 2) edges.push({ from: a.id, to: b.id, weight, reasons })
    }
  }
  return edges
}
