import type { ArtifactRecord } from '@/lib/artifacts/artifactStore'
import type { EntityRecord } from '@/lib/entities/entityEngine'
import { retrieveOperationalContinuity } from './continuityRetrieval'
import { loadContinuitySnapshots } from './continuitySnapshots'
import { buildEntityGraph, expandEntityRelationships, getEntityContinuity } from './entityGraph'
import { rankByProvenance } from './provenanceRanker'
import { assembleOperationalContext, type AssembledOperationalContext } from './contextAssembler'

export function orchestrateRetrieval(params: {
  query: string
  threadId: string
  artifacts: ArtifactRecord[]
  entities: EntityRecord[]
  lineageId?: string
  entityIds?: string[]
}): AssembledOperationalContext {
  const continuity = retrieveOperationalContinuity({
    prompt: params.query,
    currentThreadId: params.threadId,
    currentLineageId: params.lineageId,
    currentEntityIds: params.entityIds,
    artifacts: params.artifacts,
    entities: params.entities,
  })

  const graph = buildEntityGraph(params.entities, params.artifacts)
  const expanded = expandEntityRelationships(graph, params.entityIds ?? continuity.relatedEntities.map((e) => e.id), 2)
  const expandedIds = expanded.map((n) => n.id)
  const continuityMeta = getEntityContinuity(graph, expandedIds)

  const provenanceRanked = rankByProvenance(continuity.relatedArtifacts)
  const semanticFallback = params.artifacts.filter((a) => (a.prompt || '').toLowerCase().includes(params.query.toLowerCase())).slice(0, 3)

  const artifacts = [...provenanceRanked.map((r) => r.artifact), ...semanticFallback]
    .filter((a, idx, arr) => arr.findIndex((x) => x.id === a.id) === idx)
    .slice(0, 12)

  const unresolved = continuity.unresolvedContinuity.slice(0, 8)
  const snapshots = loadContinuitySnapshots().slice(0, 4)
  const entities = params.entities.filter((e) => expandedIds.includes(e.id) || continuity.relatedEntities.some((r) => r.id === e.id)).slice(0, 12)

  const assembled = assembleOperationalContext({ artifacts, entities, snapshots, unresolved })
  assembled.explanation.push(`Entity continuity unresolved=${continuityMeta.unresolvedCount} provenance=${continuityMeta.provenance.toFixed(2)}`)
  return assembled
}
