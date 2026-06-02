import type { ArtifactRecord } from '@/lib/artifacts/artifactStore'
import type { EntityRecord } from '@/lib/entities/entityEngine'

export type EntityNode = {
  id: string
  name: string
  type: 'person' | 'project' | 'venue' | 'system' | 'artifact' | 'thread'
  relatedEntities: string[]
  relatedArtifacts: string[]
  activeThreads: string[]
  provenanceScore: number
  authorityLevel?: string
  unresolvedCount: number
  temporalWeight: number
}

export function buildEntityGraph(entities: EntityRecord[], artifacts: ArtifactRecord[]): Map<string, EntityNode> {
  const graph = new Map<string, EntityNode>()
  const now = Date.now()

  for (const entity of entities) {
    const type: EntityNode['type'] = (entity.type === 'organization' || entity.type === 'context' || entity.type === 'operation') ? 'system' : (entity.type === 'location' || entity.type === 'ip') ? 'system' : entity.type
    const ageHours = Math.max(1, (now - new Date(entity.lastSeen).getTime()) / 3600000)
    graph.set(entity.id, {
      id: entity.id,
      name: entity.name,
      type,
      relatedEntities: [],
      relatedArtifacts: entity.relatedArtifacts ?? entity.linkedArtifacts ?? [],
      activeThreads: entity.relatedThreads ?? entity.linkedThreads ?? [],
      provenanceScore: Math.min(1, (entity.continuityCount + (entity.unresolvedLinks || 0)) / 20),
      authorityLevel: (entity.unresolvedLinks || 0) > 1 ? 'active' : undefined,
      unresolvedCount: entity.unresolvedLinks || 0,
      temporalWeight: Math.max(0, 1 - ageHours / (24 * 14)),
    })
  }

  for (const artifact of artifacts) {
    const ids = artifact.entities ?? []
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = graph.get(ids[i]); const b = graph.get(ids[j])
        if (!a || !b) continue
        if (!a.relatedEntities.includes(b.id)) a.relatedEntities.push(b.id)
        if (!b.relatedEntities.includes(a.id)) b.relatedEntities.push(a.id)
      }
    }
  }
  return graph
}

export function expandEntityRelationships(graph: Map<string, EntityNode>, entityIds: string[], depth = 2): EntityNode[] {
  const visited = new Set<string>(entityIds)
  let frontier = [...entityIds]
  for (let d = 0; d < depth; d++) {
    const next: string[] = []
    for (const id of frontier) {
      const n = graph.get(id)
      if (!n) continue
      for (const rel of n.relatedEntities) if (!visited.has(rel)) { visited.add(rel); next.push(rel) }
    }
    frontier = next
    if (!frontier.length) break
  }
  return [...visited].map((id) => graph.get(id)).filter(Boolean) as EntityNode[]
}

export function getRelatedEntities(graph: Map<string, EntityNode>, entityId: string): EntityNode[] {
  const node = graph.get(entityId)
  if (!node) return []
  return node.relatedEntities.map((id) => graph.get(id)).filter(Boolean) as EntityNode[]
}

export function getActiveThreads(graph: Map<string, EntityNode>, entityIds: string[]): string[] {
  return Array.from(new Set(entityIds.flatMap((id) => graph.get(id)?.activeThreads ?? [])))
}

export function getEntityContinuity(graph: Map<string, EntityNode>, entityIds: string[]): { unresolvedCount: number; provenance: number } {
  const nodes = entityIds.map((id) => graph.get(id)).filter(Boolean) as EntityNode[]
  const unresolvedCount = nodes.reduce((sum, n) => sum + n.unresolvedCount, 0)
  const provenance = nodes.length ? nodes.reduce((sum, n) => sum + n.provenanceScore, 0) / nodes.length : 0
  return { unresolvedCount, provenance }
}
