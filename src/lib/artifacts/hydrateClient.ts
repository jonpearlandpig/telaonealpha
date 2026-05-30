import { loadArtifacts, saveArtifacts, type ArtifactRecord } from './artifactStore'
import { loadEntities, saveEntities } from '@/lib/entities/entityStore'
import type { EntityRecord } from '@/lib/entities/entityEngine'

export type HydrateSource = 'supabase' | 'local' | 'empty'

export type HydrateResult = {
  source: HydrateSource
  artifactCount: number
  entityCount: number
}

// Deterministic fallback order: Supabase → localStorage → empty state
export async function hydrateClientFromDurable(): Promise<HydrateResult> {
  // Step 1: try Supabase
  try {
    const res = await fetch('/api/load-artifacts', { cache: 'no-store' })
    if (res.ok) {
      const body = await res.json() as { artifacts: ArtifactRecord[]; entities: EntityRecord[]; source: string }
      saveArtifacts(body.artifacts)
      saveEntities(body.entities)
      return { source: 'supabase', artifactCount: body.artifacts.length, entityCount: body.entities.length }
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
