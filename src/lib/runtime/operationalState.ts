import type { ArtifactRecord } from '@/lib/artifacts/artifactStore'
import type { EntityRecord } from '@/lib/entities/entityEngine'
import { computeMomentum } from './momentumEngine'

export type OperationalPriority = { id: string; reason: string; score: number }
export type OperationalObject = {
  id: string
  objectType: 'continuity-thread' | 'decision' | 'governance' | 'entity'
  lineageId?: string
  status: string
  createdAt: string
  updatedAt: string
  payload: Record<string, unknown>
}

export type OperationalState = {
  activeThreads: string[]
  activeProjects: string[]
  unresolvedContinuity: string[]
  pinnedContinuity: string[]
  recentDecisions: string[]
  activeEntities: string[]
  recentLineage: string[]
  operationalObjects: OperationalObject[]
  currentPriorities: OperationalPriority[]
  continuityIntensity: number
  operationalDrift: number
  staleImportantMemory: string[]
  governanceOutcomes?: {
    blocked: number
    denied: number
    escalated: number
    pending: number
    lastEscalationAt?: string
  }
}

export function buildOperationalState(artifacts: ArtifactRecord[], entities: EntityRecord[], currentThreadId?: string): OperationalState {
  const momentum = computeMomentum(artifacts)
  const unresolvedArtifacts = artifacts.filter((a) => /unresolved|todo|follow-up|pending|waiting/i.test(`${a.prompt || ''} ${a.structure || ''} ${a.text || ''}`))
  const activeThreads = Array.from(new Set(artifacts.map((a) => a.threadId)))
  const activeEntities = entities.sort((a, b) => b.continuityCount - a.continuityCount).slice(0, 12).map((e) => e.id)
  const priorities: OperationalPriority[] = artifacts.map((a) => {
    const sameThread = a.threadId === currentThreadId ? 20 : 0
    const unresolved = unresolvedArtifacts.some((u) => u.id === a.id) ? 30 : 0
    const pinned = a.pinned ? 18 : 0
    const recency = Math.max(0, 14 - (Date.now() - new Date(a.createdAt).getTime()) / 3600000 / 6)
    const score = unresolved + sameThread + pinned + recency
    return { id: a.id, reason: unresolved ? 'unresolved continuity' : sameThread ? 'active thread' : pinned ? 'pinned continuity' : 'recent continuity', score }
  }).sort((a, b) => b.score - a.score).slice(0, 12)

  return {
    activeThreads,
    activeProjects: [],
    unresolvedContinuity: unresolvedArtifacts.map((a) => a.id),
    pinnedContinuity: artifacts.filter((a) => a.pinned).map((a) => a.id).slice(0, 12),
    recentDecisions: [],
    activeEntities,
    recentLineage: Array.from(new Set(artifacts.map((a) => a.lineageId).filter(Boolean) as string[])).slice(0, 12),
    operationalObjects: [],
    currentPriorities: priorities,
    continuityIntensity: momentum.unresolvedPersistence + momentum.entityGravity / 5,
    operationalDrift: Math.max(0, artifacts.length - priorities.length),
    staleImportantMemory: momentum.dormantImportant.map((a) => a.id),
    governanceOutcomes: {
      blocked: 0,
      denied: 0,
      escalated: 0,
      pending: 0,
    },
  }
}
