import type { ArtifactRecord } from '@/lib/artifacts/artifactStore'
import type { EntityRecord } from '@/lib/entities/entityEngine'
import type { RankedContinuityContext } from './continuityRetrieval'
import type { OperationalState } from './operationalState'
import type { RuntimeEvent } from './runtimeTypes'

const STORAGE_KEY = 'telaone_continuity_snapshots_v1'

export type ContinuitySnapshot = {
  id: string
  createdAt: string
  snapshotKind?: 'acceleration' | 'checkpoint'
  replaySource?: 'runtime_events'
  replayedEventCount?: number
  latestReplaySequence?: number
  latestEventId?: string
  latestEventAt?: string
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
  void STORAGE_KEY
  return []
}

export function saveContinuitySnapshots(snapshots: ContinuitySnapshot[]): void {
  void snapshots
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
    snapshotKind: 'acceleration',
    replaySource: 'runtime_events',
    replayedEventCount: 0,
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

export function createReplayCheckpointSnapshot(params: {
  workspaceId: string
  threadId: string
  state: OperationalState
  events: RuntimeEvent[]
  artifacts?: ArtifactRecord[]
  entities?: EntityRecord[]
}): ContinuitySnapshot {
  const latest = params.events.at(-1)
  const createdAt = latest?.createdAt ?? new Date().toISOString()
  const lineageRefs = Array.from(new Set(params.events.map((event) => event.lineageId).filter(Boolean) as string[])).slice(-12)
  const entityRefs = params.state.activeEntities.slice(0, 12)
  const threadRefs = params.state.activeThreads.slice(0, 12)

  return {
    id: deterministicSnapshotId(`${params.workspaceId}:${params.threadId}:checkpoint`, createdAt),
    createdAt,
    snapshotKind: 'checkpoint',
    replaySource: 'runtime_events',
    replayedEventCount: params.events.length,
    latestReplaySequence: latest?.replaySequence,
    latestEventId: latest?.id,
    latestEventAt: latest?.createdAt,
    threadRefs,
    entityRefs,
    lineageRefs,
    activeArtifacts: (params.artifacts ?? []).slice(0, 8),
    relatedEntities: (params.entities ?? []).slice(0, 8),
    unresolvedThreads: params.state.currentPriorities
      .filter((priority) => priority.reason === 'unresolved continuity')
      .slice(0, 6)
      .map((priority) => ({
        id: priority.id,
        artifactCount: 1,
        unresolvedCount: 1,
        lastActive: createdAt,
      })),
    recentLineage: [],
    activeOperationalContexts: [],
    continuityMetadata: {
      unresolvedCount: params.state.unresolvedContinuity.length,
      pinnedCount: 0,
      provenanceCount: lineageRefs.length,
      temporalWeight: Math.max(0, 100 - (Date.now() - new Date(createdAt).getTime()) / 3600000),
    },
  }
}

export function persistContinuitySnapshot(snapshot: ContinuitySnapshot): ContinuitySnapshot[] {
  void snapshot
  return []
}

export function applyContinuityLifecycle(snapshot: ContinuitySnapshot): number {
  const ageHours = (Date.now() - new Date(snapshot.createdAt).getTime()) / 3600000
  const recencyWeight = Math.max(0, 30 - ageHours / 4)
  const checkpointWeight = snapshot.snapshotKind === 'checkpoint' ? 20 : 0
  const unresolvedWeight = snapshot.continuityMetadata.unresolvedCount * 8
  const pinnedWeight = snapshot.continuityMetadata.pinnedCount * 5
  const provenanceWeight = snapshot.continuityMetadata.provenanceCount * 4
  const dormantPenalty = ageHours > 120 ? (ageHours - 120) / 3 : 0
  return recencyWeight + checkpointWeight + unresolvedWeight + pinnedWeight + provenanceWeight - dormantPenalty
}

export function restoreContinuitySnapshot(snapshotId?: string): ContinuitySnapshot | null {
  void snapshotId
  return null
}

export function isReplayCheckpointSnapshot(snapshot: ContinuitySnapshot | null | undefined): snapshot is ContinuitySnapshot {
  return Boolean(
    snapshot &&
      snapshot.snapshotKind === 'checkpoint' &&
      snapshot.replaySource === 'runtime_events' &&
      typeof snapshot.replayedEventCount === 'number' &&
      typeof snapshot.latestReplaySequence === 'number',
  )
}

export function selectBestReplayCheckpoint(snapshots: ContinuitySnapshot[]): ContinuitySnapshot | null {
  return snapshots
    .filter(isReplayCheckpointSnapshot)
    .sort((left, right) => {
      const byEventCount = (right.replayedEventCount ?? 0) - (left.replayedEventCount ?? 0)
      if (byEventCount !== 0) return byEventCount
      return new Date(right.latestEventAt ?? right.createdAt).getTime() - new Date(left.latestEventAt ?? left.createdAt).getTime()
    })[0] ?? null
}
