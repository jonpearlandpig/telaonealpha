import crypto from 'crypto'

import type { CanonicalOperationalObject } from '../objects/operationalObjects'

type RestorationChecksumInput = {
  id: string
  canonicalType: string
  lineageId: string | null
  replaySequence: number | null
  replayConfirmed: boolean
  reconciliationDecision: string | null
}

export function buildRestorationChecksumInputs(
  objects: CanonicalOperationalObject[],
): RestorationChecksumInput[] {
  return objects
    .map((object) => ({
      id: object.id,
      canonicalType:
        typeof object.payload.canonicalType === 'string'
          ? object.payload.canonicalType
          : object.objectType,
      lineageId: object.lineageId ?? null,
      replaySequence: object.lastConfirmedSequence ?? null,
      replayConfirmed: object.replayConfirmed,
      reconciliationDecision:
        typeof object.payload.reconciliationDecision === 'string'
          ? object.payload.reconciliationDecision
          : null,
    }))
    .sort((left, right) => left.id.localeCompare(right.id))
}

export function createDeterministicRestorationChecksum(
  objects: CanonicalOperationalObject[],
): string {
  const payload = JSON.stringify(buildRestorationChecksumInputs(objects))
  return crypto.createHash('sha256').update(payload).digest('hex')
}
