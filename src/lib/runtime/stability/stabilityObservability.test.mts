import test from 'node:test'
import assert from 'node:assert/strict'

import type { RuntimeEvent } from '../runtimeTypes'
import { buildStabilityObservability } from './stabilityObservability'

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

test('stability observability exposes pacing health deterministically', () => {
  const output = buildStabilityObservability({
    at: '2026-05-27T00:00:20.000Z',
    events: [
      event({ id: 'evt-1', replaySequence: 1, type: 'operator.invoked', createdAt: '2026-05-27T00:00:00.000Z' }),
      event({ id: 'evt-2', replaySequence: 2, type: 'operator.invoked', createdAt: '2026-05-27T00:00:10.000Z' }),
      event({ id: 'evt-3', replaySequence: 3, type: 'operator.escalated', createdAt: '2026-05-27T00:00:15.000Z', governanceState: 'escalated', executionState: 'failed' }),
    ],
  })

  assert.equal(output.suppressedInvocations.length, 1)
  assert.equal(output.governanceStabilityMetrics.suppressedInvocationCount, 1)
  assert.equal(output.governanceStabilityMetrics.escalationDelayCount >= 1, true)
})
