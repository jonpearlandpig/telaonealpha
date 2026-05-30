import 'server-only'

import type { RuntimeEvent } from '../runtimeTypes'
import { buildCanonicalObjectsFromReplay } from './objectReplayPromotion'
import { SupabaseObjectPersistence } from './objectPersistenceSupabase'

// Promotes all replay-derived operational objects to canonical form and persists them.
//
// Called additively after reconstructOperationalStateFromReplay — does not replace
// or modify the reconstruction path. Operates on the full event set so that
// all objects are captured (not just the sliced window returned by reconstruction).
export async function persistCanonicalObjectsFromReplay(
  workspaceId: string,
  events: RuntimeEvent[],
): Promise<void> {
  const canonicalObjects = buildCanonicalObjectsFromReplay(workspaceId, events)
  if (canonicalObjects.length === 0) return

  const persistence = new SupabaseObjectPersistence()
  const result = await persistence.upsertObjects(workspaceId, canonicalObjects)

  if (!result.ok) {
    throw new Error(`[objectPersistenceWiring] upsert failed: ${result.error}`)
  }
}
