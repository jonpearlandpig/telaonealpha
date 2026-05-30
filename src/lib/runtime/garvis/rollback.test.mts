import test from 'node:test'
import assert from 'node:assert/strict'

import { reconstructRollbackLineage } from './rollback'

test('rollback lineage reconstruction preserves critical rollback signaling', () => {
  const lineage = reconstructRollbackLineage([
    {
      id: 'evt-1',
      type: 'runtime.rollback.signaled',
      createdAt: '2026-05-27T00:00:00.000Z',
      lineageId: 'lineage-1',
      traceId: 'trace-1',
      payload: {
        rollbackId: 'rb-1',
        action: 'financial.commitment',
        classification: 'CRITICAL',
        reason: 'Counterparty signature drift detected',
      },
    },
  ])

  assert.equal(lineage.length, 1)
  assert.equal(lineage[0]?.rollbackId, 'rb-1')
  assert.equal(lineage[0]?.classification, 'CRITICAL')
  assert.equal(lineage[0]?.escalated, true)
})
