import test from 'node:test'
import assert from 'node:assert/strict'

import type { RuntimeEvent } from '../runtimeTypes'
import { reconstructEscalationTraces } from './escalationTrace'

function event(input: Partial<RuntimeEvent> & Pick<RuntimeEvent, 'id' | 'type' | 'createdAt' | 'replaySequence'>): RuntimeEvent {
  return {
    workspaceId: 'tela-showtela',
    eventVersion: 1,
    schemaVersion: 'runtime.v1',
    source: 'operator',
    governanceState: 'escalated',
    executionState: 'failed',
    payload: {},
    ...input,
  }
}

test('escalation trace preserves escalation lineage and destination', () => {
  const traces = reconstructEscalationTraces([
    event({
      id: 'evt-1',
      replaySequence: 1,
      type: 'operator.escalated',
      createdAt: '2026-05-27T00:00:00.000Z',
      payload: { reason: 'two-key-missing', escalationPath: ['garvis-enforcement', 'sovereign-authority'] },
    }),
  ])

  assert.equal(traces[0]?.escalationReason, 'two-key-missing')
  assert.deepEqual(traces[0]?.escalationDestination, ['garvis-enforcement', 'sovereign-authority'])
})
