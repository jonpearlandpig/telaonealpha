import { OPERATIONAL_ONTOLOGY_VERSION } from '../ontology/operationalOntology'
import type { CanonicalOperationalObject } from '../objects/operationalObjects'
import { createDeterministicRestorationChecksum } from './restorationChecksum'

export type RestorationSnapshot = {
  workspaceId: string
  replaySequenceRange: {
    first: number | null
    last: number | null
  }
  ontologyVersion: string
  canonicalObjectCount: number
  confirmedObjectCount: number
  unresolvedObjectCount: number
  lineageChainCount: number
  reconciliationConflictCount: number
  deterministicChecksum: string
  restoredAt: string | null
}

export function createRestorationSnapshot(input: {
  workspaceId: string
  canonicalObjects: CanonicalOperationalObject[]
}): RestorationSnapshot {
  const objects = [...input.canonicalObjects].sort((left, right) => left.id.localeCompare(right.id))
  const sequences = objects
    .map((object) => object.lastConfirmedSequence)
    .filter((value): value is number => typeof value === 'number')
    .sort((left, right) => left - right)
  const lineageIds = new Set(
    objects
      .map((object) => object.lineageId)
      .filter((value): value is string => typeof value === 'string' && value.length > 0),
  )
  const restoredAt = objects
    .map((object) => object.updatedAt)
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .sort()
    .at(-1) ?? null

  return {
    workspaceId: input.workspaceId,
    replaySequenceRange: {
      first: sequences[0] ?? null,
      last: sequences.at(-1) ?? null,
    },
    ontologyVersion:
      objects.find((object) => typeof object.payload.ontologyVersion === 'string')?.payload
        .ontologyVersion as string | undefined ?? OPERATIONAL_ONTOLOGY_VERSION,
    canonicalObjectCount: objects.length,
    confirmedObjectCount: objects.filter((object) => object.replayConfirmed).length,
    unresolvedObjectCount: objects.filter((object) => !object.replayConfirmed).length,
    lineageChainCount: lineageIds.size,
    reconciliationConflictCount: objects.filter((object) =>
      object.id.includes('::conflict::') ||
      object.payload.reconciliationDecision === 'conflicting-object',
    ).length,
    deterministicChecksum: createDeterministicRestorationChecksum(objects),
    restoredAt,
  }
}
