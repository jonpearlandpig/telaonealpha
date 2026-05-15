import type { ArtifactRecord } from '@/lib/artifacts/artifactStore'

export type ContinuityMomentum = {
  continuityAcceleration: number
  unresolvedPersistence: number
  entityGravity: number
  dormantImportant: ArtifactRecord[]
  lineageContinuation: number
}

export function computeMomentum(artifacts: ArtifactRecord[]): ContinuityMomentum {
  const unresolved = artifacts.filter((a) => /unresolved|todo|follow-up|pending|waiting/i.test(`${a.prompt || ''} ${a.structure || ''} ${a.text || ''}`))
  const recent = artifacts.filter((a) => Date.now() - new Date(a.createdAt).getTime() < 1000 * 60 * 60 * 24)
  const dormantImportant = artifacts.filter((a) => a.pinned && Date.now() - new Date(a.createdAt).getTime() > 1000 * 60 * 60 * 24 * 7)
  return {
    continuityAcceleration: recent.length - Math.max(0, artifacts.length - recent.length) / 4,
    unresolvedPersistence: unresolved.length,
    entityGravity: artifacts.reduce((sum, a) => sum + (a.entities?.length ?? 0), 0),
    dormantImportant,
    lineageContinuation: new Set(artifacts.map((a) => a.lineageId).filter(Boolean)).size,
  }
}
