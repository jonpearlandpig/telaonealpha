import test from 'node:test'
import assert from 'node:assert/strict'

import type { RuntimeEvent } from '../runtimeTypes'
import { inspectObservabilityTopology } from './observabilityTopology'

function event(input: Partial<RuntimeEvent> & Pick<RuntimeEvent, 'id' | 'type' | 'createdAt' | 'replaySequence'>): RuntimeEvent {
  return {
    workspaceId: 'tela-showtela',
    eventVersion: 1,
    schemaVersion: 'runtime.v1',
    source: 'operator',
    governanceState: 'approved',
    executionState: 'completed',
    payload: {},
    ...input,
  }
}

test('observability topology explains failures blocks escalations cooldowns and determinism', () => {
  const output = inspectObservabilityTopology({
    workspaceId: 'tela-showtela',
    events: [
      event({ id: 'evt-1', replaySequence: 1, type: 'constitutional.blocked', createdAt: '2026-05-27T00:00:00.000Z', source: 'system', governanceState: 'blocked', executionState: 'failed', payload: { blockingReason: 'rights missing' } }),
      event({ id: 'evt-2', replaySequence: 2, type: 'operator.escalated', createdAt: '2026-05-27T00:00:01.000Z', governanceState: 'escalated', executionState: 'failed', payload: { reason: 'blocked', escalationPath: ['garvis-enforcement'] } }),
      event({ id: 'evt-3', replaySequence: 3, type: 'operator.invoked', createdAt: '2026-05-27T00:00:02.000Z', payload: { action: 'generate.report', operatorId: 'garvis-enforcement' } }),
      event({ id: 'evt-4', replaySequence: 4, type: 'operator.invoked', createdAt: '2026-05-27T00:00:03.000Z', payload: { action: 'generate.report', operatorId: 'garvis-enforcement' } }),
    ],
  })

  assert.equal(output.whatEscalated, 1)
  assert.equal(output.whatCooledDown.length >= 1, true)
  assert.equal(typeof output.whatRemainedDeterministic.replay, 'boolean')
})
