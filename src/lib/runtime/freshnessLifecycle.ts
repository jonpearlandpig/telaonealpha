import type { ArtifactRecord } from '@/lib/artifacts/artifactStore'

export function freshnessScore(artifact: ArtifactRecord): number {
  const ageHours = (Date.now() - new Date(artifact.createdAt).getTime()) / 3600000
  const recency = Math.max(0, 40 - ageHours / 6)
  const unresolved = /unresolved|todo|follow-up|pending|waiting/i.test(`${artifact.prompt || ''} ${artifact.structure || ''}`) ? 25 : 0
  const canonical = artifact.pinned ? 20 : 0
  const lineage = artifact.lineageId ? 15 : 0
  return recency + unresolved + canonical + lineage
}
