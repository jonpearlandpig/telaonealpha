import { loadArtifacts, saveArtifacts, type ArtifactRecord } from './artifactStore'
import { loadEntities, saveEntities } from '@/lib/entities/entityStore'
import type { EntityRecord } from '@/lib/entities/entityEngine'

export type HydrateSource = 'supabase' | 'local' | 'empty'

export type HydrateResult = {
  source: HydrateSource
  artifactCount: number
  entityCount: number
}

// Remote wins on ID conflict — Supabase is canonical.
// Local-only records are retained (may be pending the async write).
function mergeArtifacts(local: ArtifactRecord[], remote: ArtifactRecord[]): ArtifactRecord[] {
  const merged = new Map<string, ArtifactRecord>()
  for (const a of local) merged.set(a.id, a)
  for (const a of remote) merged.set(a.id, a)   // remote overwrites local on conflict
  return Array.from(merged.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

function mergeEntities(local: EntityRecord[], remote: EntityRecord[]): EntityRecord[] {
  const merged = new Map<string, EntityRecord>()
  for (const e of local) merged.set(e.id, e)
  for (const e of remote) {
    const existing = merged.get(e.id)
    if (existing) {
      // Preserve client-only fields that Supabase doesn't store
      merged.set(e.id, {
        ...e,
        aliases: existing.aliases.length ? existing.aliases : e.aliases,
        linkedArtifacts: existing.linkedArtifacts.length ? existing.linkedArtifacts : e.linkedArtifacts,
        linkedThreads: existing.linkedThreads.length ? existing.linkedThreads : e.linkedThreads,
        operationalContexts: existing.operationalContexts.length ? existing.operationalContexts : e.operationalContexts,
        continuityCount: Math.max(existing.continuityCount, e.continuityCount),
      })
    } else {
      merged.set(e.id, e)
    }
  }
  return Array.from(merged.values()).sort((a, b) => b.continuityCount - a.continuityCount)
}

// Deterministic fallback order: Supabase → localStorage → empty state
export async function hydrateClientFromDurable(): Promise<HydrateResult> {
  // Step 1: try Supabase
  try {
    const res = await fetch('/api/load-artifacts', { cache: 'no-store' })
    if (res.ok) {
      const body = await res.json() as { artifacts: ArtifactRecord[]; entities: EntityRecord[]; source: string }
      const local = loadArtifacts()
      const localEntities = loadEntities()
      const merged = mergeArtifacts(local, body.artifacts)
      const mergedEntities = mergeEntities(localEntities, body.entities)
      saveArtifacts(merged)
      saveEntities(mergedEntities)
      return { source: 'supabase', artifactCount: merged.length, entityCount: mergedEntities.length }
    }
  } catch { /* Supabase unavailable — fall through */ }

  // Step 2: localStorage as-is
  const local = loadArtifacts()
  const localEntities = loadEntities()
  if (local.length > 0 || localEntities.length > 0) {
    return { source: 'local', artifactCount: local.length, entityCount: localEntities.length }
  }

  // Step 3: empty state
  return { source: 'empty', artifactCount: 0, entityCount: 0 }
}
