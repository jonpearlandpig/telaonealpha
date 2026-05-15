import type { EntityRecord } from './entityEngine'

const STORAGE_KEY = 'telaone_entities_v1'

export function loadEntities(): EntityRecord[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]') as EntityRecord[] } catch { return [] }
}

export function saveEntities(entities: EntityRecord[]): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entities))
}

export function upsertEntities(incoming: EntityRecord[]): EntityRecord[] {
  const current = loadEntities()
  const map = new Map(current.map((e) => [e.id, e]))
  for (const entity of incoming) {
    const prev = map.get(entity.id)
    if (!prev) map.set(entity.id, entity)
    else map.set(entity.id, {
      ...prev,
      lastSeen: entity.lastSeen,
      aliases: Array.from(new Set([...prev.aliases, ...entity.aliases])),
      linkedArtifacts: Array.from(new Set([...prev.linkedArtifacts, ...entity.linkedArtifacts])),
      linkedThreads: Array.from(new Set([...prev.linkedThreads, ...entity.linkedThreads])),
      operationalContexts: Array.from(new Set([...prev.operationalContexts, ...entity.operationalContexts])),
      continuityCount: prev.continuityCount + 1,
      unresolvedLinks: prev.unresolvedLinks + entity.unresolvedLinks,
      relatedArtifacts: Array.from(new Set([...(prev.relatedArtifacts ?? []), ...(entity.relatedArtifacts ?? [])])),
      relatedThreads: Array.from(new Set([...(prev.relatedThreads ?? []), ...(entity.relatedThreads ?? [])])),
      temporalClusters: Array.from(new Set([...(prev.temporalClusters ?? []), ...(entity.temporalClusters ?? [])])),
    })
  }
  const next = Array.from(map.values()).sort((a,b)=>b.continuityCount-a.continuityCount)
  saveEntities(next)
  return next
}
