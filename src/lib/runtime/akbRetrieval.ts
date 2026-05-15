import type { ArtifactRecord } from '@/lib/artifacts/artifactStore'
import type { EntityRecord } from '@/lib/entities/entityEngine'
import { orchestrateRetrieval } from './retrievalOrchestrator'

export function retrieveOperationalContext(params: {
  query: string
  threadId: string
  artifacts: ArtifactRecord[]
  entities: EntityRecord[]
  lineageId?: string
  entityIds?: string[]
}) {
  return orchestrateRetrieval(params)
}

export function retrieveRelatedArtifacts(query: string, threadId: string, artifacts: ArtifactRecord[]): ArtifactRecord[] {
  return artifacts.filter((a) => a.threadId === threadId || (a.prompt || '').toLowerCase().includes(query.toLowerCase())).slice(0, 10)
}

export function retrieveThreadContinuity(threadId: string, artifacts: ArtifactRecord[]): ArtifactRecord[] {
  return artifacts.filter((a) => a.threadId === threadId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function retrieveEntityContext(entityIds: string[], entities: EntityRecord[]): EntityRecord[] {
  return entities.filter((e) => entityIds.includes(e.id) || e.relatedThreads?.some((t) => entityIds.includes(t))).slice(0, 12)
}

export function retrieveUnresolvedContinuity(artifacts: ArtifactRecord[]): ArtifactRecord[] {
  return artifacts.filter((a) => /unresolved|todo|follow-up|pending|waiting/i.test(`${a.prompt || ''} ${a.structure || ''} ${a.text || ''}`)).slice(0, 12)
}
