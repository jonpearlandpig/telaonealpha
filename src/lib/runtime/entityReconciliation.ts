import type { EntityRecord } from '@/lib/entities/entityEngine'

export function reconcileEntities(entities: EntityRecord[]): EntityRecord[] {
  const byName = new Map<string, EntityRecord>()
  for (const entity of entities) {
    const key = `${entity.type}:${entity.name.toLowerCase()}`
    const prev = byName.get(key)
    if (!prev) { byName.set(key, entity); continue }
    byName.set(key, {
      ...prev,
      lastSeen: new Date(prev.lastSeen) > new Date(entity.lastSeen) ? prev.lastSeen : entity.lastSeen,
      linkedArtifacts: Array.from(new Set([...prev.linkedArtifacts, ...entity.linkedArtifacts])),
      linkedThreads: Array.from(new Set([...prev.linkedThreads, ...entity.linkedThreads])),
      relatedArtifacts: Array.from(new Set([...(prev.relatedArtifacts ?? []), ...(entity.relatedArtifacts ?? [])])),
      relatedThreads: Array.from(new Set([...(prev.relatedThreads ?? []), ...(entity.relatedThreads ?? [])])),
      unresolvedLinks: (prev.unresolvedLinks || 0) + (entity.unresolvedLinks || 0),
      continuityCount: prev.continuityCount + entity.continuityCount,
    })
  }
  return Array.from(byName.values())
}
