import test from 'node:test'
import assert from 'node:assert/strict'

import type { RuntimeEvent } from '../runtimeTypes'
import { reconstructConstitutionalTraces } from './constitutionalTrace'

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

test('constitutional trace preserves middleware execution ordering from replay', () => {
  const traces = reconstructConstitutionalTraces([
    event({
      id: 'evt-1',
      replaySequence: 1,
      type: 'constitutional.invoked',
      createdAt: '2026-05-27T00:00:00.000Z',
      payload: { constitutionalPath: ['telauthorium', 'pen-and-sword', 'the-ledger'] },
    }),
  ])

  assert.deepEqual(traces[0]?.executionOrder, ['telauthorium', 'pen-and-sword', 'the-ledger'])
  assert.equal(traces[0]?.legitimacyState, 'confirmed')
})
