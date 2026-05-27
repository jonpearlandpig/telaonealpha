import test from 'node:test'
import assert from 'node:assert/strict'

import type { RuntimeEvent } from '../runtimeTypes'
import { buildEscalationHealth } from './escalationHealth'

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

test('escalation health reconstructs escalation frequency and suppression', () => {
  const output = buildEscalationHealth([
    event({ id: 'evt-1', replaySequence: 1, type: 'operator.escalated', createdAt: '2026-05-27T00:00:00.000Z', payload: { reason: 'blocked', escalationPath: ['garvis-enforcement', 'sovereign-authority'] } }),
  ])

  assert.equal(output.escalationFrequency, 1)
  assert.equal(output.escalationCeilings[0], 2)
})
