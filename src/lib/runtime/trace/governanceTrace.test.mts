import test from 'node:test'
import assert from 'node:assert/strict'

import type { RuntimeEvent } from '../runtimeTypes'
import { reconstructGovernanceTraces } from './governanceTrace'

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

test('governance trace reconstructs approvals and rejections deterministically', () => {
  const traces = reconstructGovernanceTraces([
    event({
      id: 'evt-1',
      replaySequence: 1,
      type: 'operator.analysis.completed',
      createdAt: '2026-05-27T00:00:00.000Z',
      payload: { action: 'generate.report', legal: true, governancePath: ['pen-and-sword', 'flightpath'] },
    }),
    event({
      id: 'evt-2',
      replaySequence: 2,
      type: 'operator.blocked',
      createdAt: '2026-05-27T00:00:01.000Z',
      payload: { action: 'generate.report', denialReason: 'blocked' },
      governanceState: 'blocked',
      executionState: 'failed',
    }),
  ])

  assert.equal(traces.length, 2)
  assert.equal(traces[0]?.legalityDecision, 'approved')
  assert.equal(traces[1]?.legalityDecision, 'blocked')
})
