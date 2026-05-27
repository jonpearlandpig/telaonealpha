import type { ReplayObservabilitySnapshot } from './replayObservability'

export type ReplayDriftReason =
  | 'checksum-divergence'
  | 'ontology-divergence'
  | 'reconciliation-divergence'
  | 'lineage-divergence'
  | 'identity-mutation'
  | 'confirmation-state-mutation'

export type ReplayDriftDiagnostics = {
  replayDriftDetected: boolean
  checksumDiverged: boolean
  ontologyDiverged: boolean
  reconciliationDiverged: boolean
  lineageDiverged: boolean
  identityMutated: boolean
  confirmationStateMutated: boolean
  reasons: ReplayDriftReason[]
}

export function detectReplayDrift(input: {
  first: ReplayObservabilitySnapshot
  second: ReplayObservabilitySnapshot
  identityStable: boolean
  reconciliationStable: boolean
  lineageStable: boolean
  confirmationStable: boolean
}): ReplayDriftDiagnostics {
  const checksumDiverged = input.first.restorationChecksum !== input.second.restorationChecksum
  const ontologyDiverged = input.first.ontologyVersion !== input.second.ontologyVersion
  const reconciliationDiverged =
    input.first.reconciliationConflictCount !== input.second.reconciliationConflictCount ||
    !input.reconciliationStable
  const lineageDiverged =
    input.first.lineageChainCount !== input.second.lineageChainCount ||
    input.first.replaySequenceRange.first !== input.second.replaySequenceRange.first ||
    input.first.replaySequenceRange.last !== input.second.replaySequenceRange.last ||
    !input.lineageStable
  const identityMutated =
    input.first.canonicalObjectCount !== input.second.canonicalObjectCount ||
    !input.identityStable
  const confirmationStateMutated =
    input.first.confirmedObjectCount !== input.second.confirmedObjectCount ||
    input.first.unresolvedObjectCount !== input.second.unresolvedObjectCount ||
    !input.confirmationStable

  const reasons: ReplayDriftReason[] = []
  if (checksumDiverged) reasons.push('checksum-divergence')
  if (ontologyDiverged) reasons.push('ontology-divergence')
  if (reconciliationDiverged) reasons.push('reconciliation-divergence')
  if (lineageDiverged) reasons.push('lineage-divergence')
  if (identityMutated) reasons.push('identity-mutation')
  if (confirmationStateMutated) reasons.push('confirmation-state-mutation')

  return {
    replayDriftDetected: reasons.length > 0,
    checksumDiverged,
    ontologyDiverged,
    reconciliationDiverged,
    lineageDiverged,
    identityMutated,
    confirmationStateMutated,
    reasons,
  }
}
