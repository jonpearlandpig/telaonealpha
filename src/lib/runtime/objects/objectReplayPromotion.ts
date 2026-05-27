import { deriveOperationalObjects } from '../replay/derivedArtifacts'
import type { OperationalObject } from '../operationalState'
import type { RuntimeEvent } from '../runtimeTypes'
import { normalizeReplayDerivedObject, type NormalizedOperationalReplayObject } from '../ontology/objectNormalization'
import { createConflictStorageId, reconcileNormalizedObjects } from '../ontology/reconciliation'
import { confirmObjectAtSequence, createCanonicalObject } from './operationalObjects'
import type { CanonicalOperationalObject } from './operationalObjects'

// Promotion rules:
//   - An object is replayConfirmed if at least one approved event references it
//   - lastConfirmedSequence is the highest approved event's replaySequence
//   - Objects produced only by non-approved events are persisted as unconfirmed proposals
export function buildCanonicalObjectsFromReplay(
  workspaceId: string,
  events: RuntimeEvent[],
): CanonicalOperationalObject[] {
  if (events.length === 0) return []

  const ordered = [...events].sort(
    (a, b) => (a.replaySequence ?? 0) - (b.replaySequence ?? 0),
  )

  type ObjectAccumulator = {
    storageId: string
    normalized: NormalizedOperationalReplayObject
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
      const normalized = normalizeReplayDerivedObject({
        object: obj,
        event,
        replayConfirmed: isApproved,
        lastConfirmedSequence: isApproved ? event.replaySequence ?? undefined : undefined,
      })
      const existing = objectMap.get(normalized.canonicalObjectId)

      if (!existing) {
        objectMap.set(normalized.canonicalObjectId, {
          storageId: normalized.storageId,
          normalized,
          obj,
          originEventId: event.id,
          originEventType: event.type,
          replayConfirmed: isApproved,
          lastConfirmedSequence: isApproved ? (event.replaySequence ?? undefined) : undefined,
          confirmedByEventId: isApproved ? event.id : undefined,
        })
        continue
      }

      const reconciliation = reconcileNormalizedObjects(existing.normalized, normalized)
      if (reconciliation.decision === 'conflicting-object') {
        objectMap.set(createConflictStorageId(normalized), {
          storageId: createConflictStorageId(normalized),
          normalized,
          obj: {
            ...obj,
            id: createConflictStorageId(normalized),
            payload: {
              ...obj.payload,
              canonicalType: normalized.ontologyType,
              reconciliationDecision: reconciliation.diagnostics.reconciliationDecision,
            },
          },
          originEventId: event.id,
          originEventType: event.type,
          replayConfirmed: isApproved,
          lastConfirmedSequence: isApproved ? (event.replaySequence ?? undefined) : undefined,
          confirmedByEventId: isApproved ? event.id : undefined,
        })
        continue
      }

      const mergedObj: OperationalObject = {
        ...existing.obj,
        ...obj,
        payload: {
          ...existing.obj.payload,
          ...obj.payload,
          canonicalType: normalized.ontologyType,
          reconciliationDecision: reconciliation.diagnostics.reconciliationDecision,
        },
        updatedAt: obj.updatedAt,
      }

      objectMap.set(normalized.canonicalObjectId, {
        ...existing,
        normalized: {
          ...normalized,
          storageId: existing.storageId,
          replayConfirmed: existing.replayConfirmed || isApproved,
          lastConfirmedSequence:
            isApproved && event.replaySequence !== undefined
              ? Math.max(existing.lastConfirmedSequence ?? 0, event.replaySequence)
              : existing.lastConfirmedSequence,
        },
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

  const canonicalObjects: CanonicalOperationalObject[] = []

  for (const acc of objectMap.values()) {
    let canonical = createCanonicalObject(
      {
        ...acc.obj,
        id: acc.storageId,
        payload: {
          ...acc.obj.payload,
          canonicalType: acc.normalized.ontologyType,
          ontologyVersion: acc.normalized.diagnostics.ontologyVersion,
          replayNormalizationPass: acc.normalized.diagnostics.replayNormalizationPass,
          canonicalIdentitySource: acc.normalized.diagnostics.canonicalIdentitySource,
        },
      },
      workspaceId,
      acc.originEventId,
      acc.originEventType,
      acc.replayConfirmed ? 'replay' : 'ingest',
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

  return canonicalObjects
}
