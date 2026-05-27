import test from 'node:test'
import assert from 'node:assert/strict'

import type { ReplayObservabilitySnapshot } from './replayObservability'
import { detectReplayDrift } from './replayDrift'

const stable: ReplayObservabilitySnapshot = {
  replayChecksum: 'a',
  restorationChecksum: 'a',
  replayConverged: true,
  replayDriftDetected: false,
  deterministicRestoration: true,
  reconciliationConflictCount: 0,
  hydrationPassCount: 2,
  canonicalObjectCount: 3,
  confirmedObjectCount: 2,
  unresolvedObjectCount: 1,
  lineageChainCount: 1,
  ontologyVersion: 'operational-ontology.v1',
  replaySequenceRange: { first: 1, last: 2 },
  assembledAt: '2026-05-27T12:01:00.000Z',
}

test('replay drift becomes observable when deterministic telemetry diverges', () => {
  const drift = detectReplayDrift({
    first: stable,
    second: {
      ...stable,
      restorationChecksum: 'b',
      replayChecksum: 'b',
      canonicalObjectCount: 4,
      reconciliationConflictCount: 1,
    },
    identityStable: false,
    reconciliationStable: false,
    lineageStable: true,
    confirmationStable: true,
  })

  assert.equal(drift.replayDriftDetected, true)
  assert.deepEqual(drift.reasons, [
    'checksum-divergence',
    'reconciliation-divergence',
    'identity-mutation',
  ])
})
