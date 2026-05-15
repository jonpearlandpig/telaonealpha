import type { ArtifactRecord } from '@/lib/artifacts/artifactStore'
import type { EntityRecord } from '@/lib/entities/entityEngine'

export type ContinuityThread = {
  id: string
  artifactCount: number
  lastActive: string
  unresolvedCount: number
}

export type ContinuityRetrievalInput = {
  prompt: string
  currentThreadId: string
  currentEntityIds?: string[]
  currentLineageId?: string
  artifacts: ArtifactRecord[]
  entities: EntityRecord[]
}

export type RankedContinuityContext = {
  relatedArtifacts: ArtifactRecord[]
  relatedEntities: EntityRecord[]
  activeThreads: ContinuityThread[]
  unresolvedContinuity: ArtifactRecord[]
  recentLineage: ArtifactRecord[]
}

function scoreArtifact(a: ArtifactRecord, input: ContinuityRetrievalInput, nowMs: number): number {
  let score = 0
  if (a.threadId === input.currentThreadId) score += 30
  if (input.currentLineageId && a.lineageId === input.currentLineageId) score += 22
  if (/unresolved|todo|follow-up|pending|waiting/i.test(`${a.prompt || ''} ${a.structure || ''} ${a.text || ''}`)) score += 18
  if (a.pinned) score += 14
  const ageHours = Math.max(1, (nowMs - new Date(a.createdAt).getTime()) / 3600000)
  score += Math.max(0, 14 - ageHours / 8)
  if (a.lineageId) score += 8
  const overlap = (a.entities || []).filter((id) => (input.currentEntityIds || []).includes(id)).length
  score += overlap * 6
  if (a.artifactGroupId) score += 4
  return score
}

export function retrieveOperationalContinuity(input: ContinuityRetrievalInput): RankedContinuityContext {
  const nowMs = Date.now()
  const rankedArtifacts = [...input.artifacts].map((artifact) => ({ artifact, score: scoreArtifact(artifact, input, nowMs) })).sort((a, b) => b.score - a.score)
  const relatedArtifacts = rankedArtifacts.slice(0, 8).map((entry) => entry.artifact)

  const relatedEntities = [...input.entities].map((entity) => {
    const overlap = entity.relatedThreads?.includes(input.currentThreadId) ? 1 : 0
    const unresolvedWeight = entity.unresolvedLinks || 0
    const recency = Math.max(0, 10 - ((nowMs - new Date(entity.lastSeen).getTime()) / 3600000) / 12)
    const score = entity.continuityCount * 3 + overlap * 8 + unresolvedWeight * 3 + recency
    return { entity, score }
  }).sort((a, b) => b.score - a.score).slice(0, 8).map((entry) => entry.entity)

  const threadMap = new Map<string, ContinuityThread>()
  for (const artifact of input.artifacts) {
    const existing = threadMap.get(artifact.threadId)
    const unresolvedHit = /unresolved|todo|follow-up|pending|waiting/i.test(`${artifact.prompt || ''} ${artifact.structure || ''} ${artifact.text || ''}`) ? 1 : 0
    if (!existing) {
      threadMap.set(artifact.threadId, { id: artifact.threadId, artifactCount: 1, lastActive: artifact.createdAt, unresolvedCount: unresolvedHit })
      continue
    }
    existing.artifactCount += 1
    existing.unresolvedCount += unresolvedHit
    if (new Date(artifact.createdAt).getTime() > new Date(existing.lastActive).getTime()) existing.lastActive = artifact.createdAt
  }

  const activeThreads = Array.from(threadMap.values()).sort((a, b) => new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime()).slice(0, 6)
  const unresolvedContinuity = rankedArtifacts.filter((entry) => /unresolved|todo|follow-up|pending|waiting/i.test(`${entry.artifact.prompt || ''} ${entry.artifact.structure || ''} ${entry.artifact.text || ''}`)).slice(0, 6).map((entry) => entry.artifact)
  const recentLineage = rankedArtifacts.filter((entry) => Boolean(entry.artifact.lineageId)).slice(0, 6).map((entry) => entry.artifact)
  return { relatedArtifacts, relatedEntities, activeThreads, unresolvedContinuity, recentLineage }
}
