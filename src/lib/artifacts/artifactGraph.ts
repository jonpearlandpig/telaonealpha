import type { ArtifactRecord } from './artifactStore'
import { inferRelationships, type RelationshipEdge } from './relationshipEngine'

export type ArtifactGraph = {
  nodes: ArtifactRecord[]
  edges: RelationshipEdge[]
  byId: Record<string, ArtifactRecord>
}

export function buildArtifactGraph(artifacts: ArtifactRecord[]): ArtifactGraph {
  const edges = inferRelationships(artifacts).sort((a, b) => b.weight - a.weight)
  const byId = Object.fromEntries(artifacts.map((a) => [a.id, a]))
  return { nodes: artifacts, edges, byId }
}
