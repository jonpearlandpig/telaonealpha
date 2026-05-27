import test from 'node:test'
import assert from 'node:assert/strict'

import type { RuntimeEvent } from '../runtimeTypes'
import { derivePriorityTier, derivePriorityTierForModule } from './priorityTiers'

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

test('deterministic priority tiers derive from governance topology', () => {
  assert.equal(derivePriorityTierForModule('telauthorium'), 'constitutional')
  assert.equal(derivePriorityTierForModule('garvis-enforcement'), 'governance-critical')
  assert.equal(derivePriorityTierForModule('mose-router'), 'operational-critical')
})

test('event priority tiering remains deterministic without semantic inference', () => {
  assert.equal(derivePriorityTier(event({ id: 'evt-1', replaySequence: 1, type: 'constitutional.invoked', createdAt: '2026-05-27T00:00:00.000Z', source: 'system' })), 'constitutional')
  assert.equal(derivePriorityTier(event({ id: 'evt-2', replaySequence: 2, type: 'operator.escalated', createdAt: '2026-05-27T00:00:00.000Z' })), 'governance-critical')
})
