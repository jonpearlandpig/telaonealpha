import type { ArtifactRecord } from '@/lib/artifacts/artifactStore'
import type { EntityRecord } from '@/lib/entities/entityEngine'
import type { RankedContinuityContext } from './continuityRetrieval'

const STORAGE_KEY = 'telaone_continuity_snapshots_v1'

export type ContinuitySnapshot = {
  id: string
  createdAt: string
  threadRefs: string[]
  entityRefs: string[]
  lineageRefs: string[]
  activeArtifacts: ArtifactRecord[]
  relatedEntities: EntityRecord[]
  unresolvedThreads: RankedContinuityContext['activeThreads']
  recentLineage: ArtifactRecord[]
  activeOperationalContexts: string[]
  continuityMetadata: {
    unresolvedCount: number
    pinnedCount: number
    provenanceCount: number
    temporalWeight: number
  }
}

function hashSeed(seed: string): string {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = (h ^ seed.charCodeAt(i)) * 16777619
  return Math.abs(h >>> 0).toString(36)
}

export function deterministicSnapshotId(threadId: string, createdAt: string): string {
  return `snap_${hashSeed(`${threadId}|${createdAt}`)}`
}

export function loadContinuitySnapshots(): ContinuitySnapshot[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ContinuitySnapshot[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveContinuitySnapshots(snapshots: ContinuitySnapshot[]): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshots))
}

export function createContinuitySnapshot(params: {
  threadId: string
  artifacts: ArtifactRecord[]
  entities: EntityRecord[]
  continuity: RankedContinuityContext
}): ContinuitySnapshot {
  const createdAt = new Date().toISOString()
  const activeArtifacts = params.continuity.relatedArtifacts.slice(0, 8)
  const recentLineage = params.continuity.recentLineage.slice(0, 6)
  const unresolvedThreads = params.continuity.activeThreads.filter((t) => t.unresolvedCount > 0).slice(0, 6)
  const threadRefs = Array.from(new Set(activeArtifacts.map((a) => a.threadId))).slice(0, 8)
  const entityRefs = Array.from(new Set(params.continuity.relatedEntities.map((e) => e.id))).slice(0, 12)
  const lineageRefs = Array.from(new Set(recentLineage.map((a) => a.lineageId).filter(Boolean) as string[]))
  const activeOperationalContexts = Array.from(new Set(params.entities.flatMap((e) => e.operationalContexts || []))).slice(0, 10)

  return {
    id: deterministicSnapshotId(params.threadId, createdAt),
    createdAt,
    threadRefs,
    entityRefs,
    lineageRefs,
    activeArtifacts,
    relatedEntities: params.continuity.relatedEntities.slice(0, 8),
    unresolvedThreads,
    recentLineage,
    activeOperationalContexts,
    continuityMetadata: {
      unresolvedCount: params.continuity.unresolvedContinuity.length,
      pinnedCount: activeArtifacts.filter((a) => a.pinned).length,
      provenanceCount: recentLineage.filter((a) => a.lineageId).length,
      temporalWeight: Math.max(0, 100 - (Date.now() - new Date(createdAt).getTime()) / 3600000),
    },
  }
}

export function persistContinuitySnapshot(snapshot: ContinuitySnapshot): ContinuitySnapshot[] {
  const snapshots = loadContinuitySnapshots()
  const next = [snapshot, ...snapshots].slice(0, 40)
  saveContinuitySnapshots(next)
  return next
}

export function applyContinuityLifecycle(snapshot: ContinuitySnapshot): number {
  const ageHours = (Date.now() - new Date(snapshot.createdAt).getTime()) / 3600000
  const recencyWeight = Math.max(0, 30 - ageHours / 4)
  const unresolvedWeight = snapshot.continuityMetadata.unresolvedCount * 8
  const pinnedWeight = snapshot.continuityMetadata.pinnedCount * 5
  const provenanceWeight = snapshot.continuityMetadata.provenanceCount * 4
  const dormantPenalty = ageHours > 120 ? (ageHours - 120) / 3 : 0
  return recencyWeight + unresolvedWeight + pinnedWeight + provenanceWeight - dormantPenalty
}

export function restoreContinuitySnapshot(snapshotId?: string): ContinuitySnapshot | null {
  const snapshots = loadContinuitySnapshots()
  if (!snapshots.length) return null
  if (snapshotId) {
    const explicit = snapshots.find((s) => s.id === snapshotId)
    if (explicit) return explicit
  }
  return [...snapshots].sort((a, b) => applyContinuityLifecycle(b) - applyContinuityLifecycle(a))[0] ?? null
}
