import test from 'node:test'
import assert from 'node:assert/strict'

import type { RuntimeEvent } from '../runtimeTypes'
import { inspectTraceTopology } from './traceTopology'

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

test('trace topology answers what routed, validated, blocked, escalated, and completed', () => {
  const topology = inspectTraceTopology([
    event({
      id: 'evt-c',
      replaySequence: 1,
      type: 'constitutional.legitimacy.confirmed',
      createdAt: '2026-05-27T00:00:00.000Z',
      lineageId: 'lineage-1',
      payload: { constitutionalPath: ['telauthorium', 'pen-and-sword', 'the-ledger'] },
      source: 'system',
    }),
    event({
      id: 'evt-r',
      replaySequence: 2,
      type: 'operator.analysis.completed',
      createdAt: '2026-05-27T00:00:01.000Z',
      lineageId: 'lineage-1',
      payload: {
        action: 'generate.report',
        routingPlanId: 'plan-1',
        selectedOperators: ['garvis-enforcement'],
        legal: true,
        explanation: { summary: 'generate.report routed through garvis-enforcement' },
      },
    }),
    event({
      id: 'evt-o',
      replaySequence: 3,
      type: 'operator.invoked',
      createdAt: '2026-05-27T00:00:02.000Z',
      lineageId: 'lineage-1',
      payload: { action: 'generate.report', operatorId: 'garvis-enforcement' },
    }),
  ])

  assert.equal(topology.whatRouted.length, 1)
  assert.equal(topology.whyItRouted[0], 'generate.report routed through garvis-enforcement')
  assert.equal(topology.whatCompleted.length, 1)
})
