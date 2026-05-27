import test from 'node:test'
import assert from 'node:assert/strict'

import type { RuntimeEvent } from '../runtimeTypes'
import { reconstructInvocationTraces } from './invocationTrace'

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

test('invocation trace reconstructs governed invocation lineage', () => {
  const traces = reconstructInvocationTraces([
    event({
      id: 'evt-c1',
      replaySequence: 1,
      type: 'constitutional.invoked',
      createdAt: '2026-05-27T00:00:00.000Z',
      lineageId: 'lineage-1',
      payload: { constitutionalPath: ['telauthorium', 'pen-and-sword', 'the-ledger'] },
      source: 'system',
    }),
    event({
      id: 'evt-c2',
      replaySequence: 2,
      type: 'constitutional.legitimacy.confirmed',
      createdAt: '2026-05-27T00:00:01.000Z',
      lineageId: 'lineage-1',
      payload: { constitutionalPath: ['telauthorium', 'pen-and-sword', 'the-ledger'] },
      source: 'system',
    }),
    event({
      id: 'evt-r1',
      replaySequence: 3,
      type: 'operator.analysis.completed',
      createdAt: '2026-05-27T00:00:02.000Z',
      lineageId: 'lineage-1',
      traceId: 'trace-1',
      correlationId: 'corr-1',
      payload: {
        action: 'generate.report',
        operatorId: 'garvis-enforcement',
        routingPlanId: 'plan-1',
        selectedOperators: ['garvis-enforcement'],
        legal: true,
        explanation: { summary: 'generate.report routed through garvis-enforcement' },
      },
    }),
    event({
      id: 'evt-o1',
      replaySequence: 4,
      type: 'operator.invoked',
      createdAt: '2026-05-27T00:00:03.000Z',
      lineageId: 'lineage-1',
      traceId: 'trace-1',
      correlationId: 'corr-1',
      payload: { action: 'generate.report', operatorId: 'garvis-enforcement' },
    }),
  ])

  assert.equal(traces.length, 1)
  assert.equal(traces[0]?.moduleSelected, 'garvis-enforcement')
  assert.equal(traces[0]?.constitutionalValidation, 'confirmed')
  assert.deepEqual(traces[0]?.recommendationLineage, ['garvis-enforcement'])
})
