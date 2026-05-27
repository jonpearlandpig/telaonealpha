import test from 'node:test'
import assert from 'node:assert/strict'

import { buildConstitutionalObservability } from './constitutionalObservability'
import type { RuntimeEvent } from '@/lib/runtime/runtimeTypes'

function event(input: Partial<RuntimeEvent> & Pick<RuntimeEvent, 'id' | 'type' | 'createdAt' | 'replaySequence'>): RuntimeEvent {
  return {
    workspaceId: 'tela-showtela',
    eventVersion: 1,
    schemaVersion: 'runtime.v1',
    source: 'system',
    governanceState: 'approved',
    executionState: 'completed',
    payload: {},
    ...input,
  }
}

test('constitutional observability reconstructs lifecycle activity from replay', () => {
  const output = buildConstitutionalObservability([
    event({
      id: 'evt-1',
      type: 'constitutional.invoked',
      createdAt: '2026-05-27T00:00:00.000Z',
      replaySequence: 1,
      payload: { auditTrace: { auditId: 'audit:1' } },
    }),
    event({
      id: 'evt-2',
      type: 'constitutional.validated',
      createdAt: '2026-05-27T00:00:01.000Z',
      replaySequence: 2,
      payload: { legalityConfirmed: true },
    }),
    event({
      id: 'evt-3',
      type: 'constitutional.legitimacy.confirmed',
      createdAt: '2026-05-27T00:00:02.000Z',
      replaySequence: 3,
    }),
    event({
      id: 'evt-4',
      type: 'constitutional.audit.logged',
      createdAt: '2026-05-27T00:00:03.000Z',
      replaySequence: 4,
      payload: { auditTrace: { auditId: 'audit:1' } },
    }),
  ])

  assert.equal(output.legitimacyConfirmations, 1)
  assert.equal(output.governanceFailures, 0)
  assert.equal(output.executionCounts['constitutional.invoked'], 1)
  assert.equal(output.auditTraces.length, 2)
  assert.equal(output.legalityState, 'confirmed')
})

test('constitutional observability preserves escalation paths from replay', () => {
  const output = buildConstitutionalObservability([
    event({
      id: 'evt-1',
      type: 'constitutional.blocked',
      createdAt: '2026-05-27T00:00:00.000Z',
      replaySequence: 1,
    }),
    event({
      id: 'evt-2',
      type: 'constitutional.escalated',
      createdAt: '2026-05-27T00:00:01.000Z',
      replaySequence: 2,
      payload: { constitutionalPath: ['telauthorium', 'pen-and-sword', 'the-ledger'] },
    }),
  ])

  assert.equal(output.governanceFailures, 1)
  assert.deepEqual(output.escalationPaths[0], ['telauthorium', 'pen-and-sword', 'the-ledger'])
  assert.equal(output.legalityState, 'failed')
})
