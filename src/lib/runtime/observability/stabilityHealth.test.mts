import test from 'node:test'
import assert from 'node:assert/strict'

import type { RuntimeEvent } from '../runtimeTypes'
import { buildStabilityHealth } from './stabilityHealth'

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

test('stability health reports cooldowns and suppressed invocations deterministically', () => {
  const output = buildStabilityHealth([
    event({ id: 'evt-1', replaySequence: 1, type: 'operator.invoked', createdAt: '2026-05-27T00:00:00.000Z' }),
    event({ id: 'evt-2', replaySequence: 2, type: 'operator.invoked', createdAt: '2026-05-27T00:00:10.000Z' }),
  ])

  assert.equal(output.invocationStormsPrevented, 1)
  assert.equal(output.suppressedInvocations.length, 1)
})
