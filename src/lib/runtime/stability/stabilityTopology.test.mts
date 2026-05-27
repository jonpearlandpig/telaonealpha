import test from 'node:test'
import assert from 'node:assert/strict'

import type { RuntimeEvent } from '../runtimeTypes'
import { inspectStabilityTopology } from './stabilityTopology'

function event(input: Partial<RuntimeEvent> & Pick<RuntimeEvent, 'id' | 'type' | 'createdAt' | 'replaySequence'>): RuntimeEvent {
  return {
    workspaceId: 'tela-showtela',
    eventVersion: 1,
    schemaVersion: 'runtime.v1',
    source: 'operator',
    governanceState: 'approved',
    executionState: 'completed',
    payload: { action: 'generate.report', operatorId: 'garvis-enforcement' },
    ...input,
  }
}

test('stability topology explains suppression, cooldowns, tiers, and constitutional exemptions', () => {
  const topology = inspectStabilityTopology({
    at: '2026-05-27T00:00:20.000Z',
    events: [
      event({ id: 'evt-1', replaySequence: 1, type: 'constitutional.invoked', createdAt: '2026-05-27T00:00:00.000Z', source: 'system' }),
      event({ id: 'evt-2', replaySequence: 2, type: 'operator.invoked', createdAt: '2026-05-27T00:00:05.000Z' }),
      event({ id: 'evt-3', replaySequence: 3, type: 'operator.invoked', createdAt: '2026-05-27T00:00:10.000Z' }),
      event({ id: 'evt-4', replaySequence: 4, type: 'operator.escalated', createdAt: '2026-05-27T00:00:15.000Z', governanceState: 'escalated', executionState: 'failed' }),
    ],
  })

  assert.equal(topology.whatIsSuppressed.length, 1)
  assert.equal(topology.constitutionalExempt.length >= 1, true)
  assert.equal(topology.priorityTiers.some((item) => item.tier === 'constitutional'), true)
})
