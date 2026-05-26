import 'server-only'

import { deriveOperationalObjects } from '../replay/derivedArtifacts'
import type { RuntimeEvent } from '../runtimeTypes'
import type { OperationalObject } from '../operationalState'
import { confirmObjectAtSequence, createCanonicalObject } from './operationalObjects'
import type { CanonicalOperationalObject } from './operationalObjects'
import { SupabaseObjectPersistence } from './objectPersistenceSupabase'

// Promotes all replay-derived operational objects to canonical form and persists them.
//
// Called additively after reconstructOperationalStateFromReplay — does not replace
// or modify the reconstruction path. Operates on the full sorted event set so that
// all objects are captured (not just the sliced window returned by reconstruction).
//
// Promotion rules:
//   - An object is replayConfirmed if at least one approved event references it
//   - lastConfirmedSequence is the highest approved event's replaySequence
//   - Objects produced only by non-approved events are persisted as unconfirmed proposals
export async function persistCanonicalObjectsFromReplay(
  workspaceId: string,
  events: RuntimeEvent[],
): Promise<void> {
  if (events.length === 0) return

  const ordered = [...events].sort(
    (a, b) => (a.replaySequence ?? 0) - (b.replaySequence ?? 0),
  )

  // Build a merged object map from all events (mirrors reconstruction merge logic)
  type ObjectAccumulator = {
    obj: OperationalObject
    originEventId: string
    originEventType: string
    replayConfirmed: boolean
    lastConfirmedSequence: number | undefined
    confirmedByEventId: string | undefined
  }

  const objectMap = new Map<string, ObjectAccumulator>()

  for (const event of ordered) {
    const derived = deriveOperationalObjects(event)
    const isApproved = event.governanceState === 'approved'

    for (const obj of derived) {
      const existing = objectMap.get(obj.id)

      if (!existing) {
        objectMap.set(obj.id, {
          obj,
          originEventId: event.id,
          originEventType: event.type,
          replayConfirmed: isApproved,
          lastConfirmedSequence: isApproved ? (event.replaySequence ?? undefined) : undefined,
          confirmedByEventId: isApproved ? event.id : undefined,
        })
      } else {
        const mergedObj: OperationalObject = {
          ...existing.obj,
          ...obj,
          payload: { ...existing.obj.payload, ...obj.payload },
          updatedAt: obj.updatedAt,
        }

        objectMap.set(obj.id, {
          ...existing,
          obj: mergedObj,
          replayConfirmed: existing.replayConfirmed || isApproved,
          lastConfirmedSequence:
            isApproved && event.replaySequence !== undefined
              ? Math.max(existing.lastConfirmedSequence ?? 0, event.replaySequence)
              : existing.lastConfirmedSequence,
          confirmedByEventId:
            isApproved && event.replaySequence !== undefined &&
            event.replaySequence > (existing.lastConfirmedSequence ?? -1)
              ? event.id
              : existing.confirmedByEventId,
        })
      }
    }
  }

  if (objectMap.size === 0) return

  const canonicalObjects: CanonicalOperationalObject[] = []

  for (const acc of objectMap.values()) {
    let canonical = createCanonicalObject(
      acc.obj,
      workspaceId,
      acc.originEventId,
      acc.originEventType,
      'replay',
      acc.obj.lineageId,
    )

    if (acc.replayConfirmed && acc.lastConfirmedSequence !== undefined && acc.confirmedByEventId) {
      canonical = confirmObjectAtSequence(
        canonical,
        acc.lastConfirmedSequence,
        acc.confirmedByEventId,
      )
    }

    canonicalObjects.push(canonical)
  }

  const persistence = new SupabaseObjectPersistence()
  const result = await persistence.upsertObjects(workspaceId, canonicalObjects)

  if (!result.ok) {
    throw new Error(`[objectPersistenceWiring] upsert failed: ${result.error}`)
  }
}
