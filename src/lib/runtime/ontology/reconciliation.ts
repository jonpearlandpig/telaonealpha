import type { NormalizedOperationalReplayObject } from './objectNormalization'

export const RECONCILIATION_SOURCE = 'deterministic-reconciliation.v1'

export type ReconciliationDecision =
  | 'same-object'
  | 'superseded-object'
  | 'conflicting-object'
  | 'unrelated-object'

export type ReconciliationDiagnostics = {
  reconciliationSource: typeof RECONCILIATION_SOURCE
  reconciliationDecision: ReconciliationDecision
}

export type ReconciliationResult = {
  decision: ReconciliationDecision
  diagnostics: ReconciliationDiagnostics
}

export function reconcileNormalizedObjects(
  existing: NormalizedOperationalReplayObject,
  incoming: NormalizedOperationalReplayObject,
): ReconciliationResult {
  if (existing.canonicalObjectId !== incoming.canonicalObjectId) {
    return result('unrelated-object')
  }

  if (existing.ontologyType !== incoming.ontologyType) {
    return result('conflicting-object')
  }

  if (!sharesLineage(existing, incoming)) {
    return result('conflicting-object')
  }

  if (sameStructuralState(existing, incoming)) {
    return result('same-object')
  }

  return result('superseded-object')
}

export function createConflictStorageId(
  object: NormalizedOperationalReplayObject,
): string {
  return `${object.canonicalObjectId}::conflict::${object.sourceEventId}`
}

function sharesLineage(
  existing: NormalizedOperationalReplayObject,
  incoming: NormalizedOperationalReplayObject,
): boolean {
  if (!existing.lineageId || !incoming.lineageId) return true
  return existing.lineageId === incoming.lineageId
}

function sameStructuralState(
  existing: NormalizedOperationalReplayObject,
  incoming: NormalizedOperationalReplayObject,
): boolean {
  return (
    existing.status === incoming.status &&
    existing.replayConfirmed === incoming.replayConfirmed &&
    existing.lastConfirmedSequence === incoming.lastConfirmedSequence &&
    JSON.stringify(existing.payload) === JSON.stringify(incoming.payload)
  )
}

function result(decision: ReconciliationDecision): ReconciliationResult {
  return {
    decision,
    diagnostics: {
      reconciliationSource: RECONCILIATION_SOURCE,
      reconciliationDecision: decision,
    },
  }
}
