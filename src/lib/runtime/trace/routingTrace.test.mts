import test from 'node:test'
import assert from 'node:assert/strict'

import type { RuntimeEvent } from '../runtimeTypes'
import { buildRoutingTrace, createDeterministicTraceId, reconstructRoutingTraces } from './routingTrace'

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

test('deterministic routing trace ids remain stable across reconstruction', () => {
  const first = createDeterministicTraceId(['a', 'b', 'c'])
  const second = createDeterministicTraceId(['a', 'b', 'c'])
  assert.equal(first, second)
})

test('routing trace preserves explainable routing lineage', () => {
  const trace = buildRoutingTrace(event({
    id: 'evt-route',
    replaySequence: 1,
    type: 'operator.analysis.completed',
    createdAt: '2026-05-27T00:00:00.000Z',
    lineageId: 'lineage-1',
    traceId: 'trace-1',
    correlationId: 'corr-1',
    payload: {
      action: 'generate.report',
      routingPlanId: 'plan-1',
      selectedOperators: ['garvis-enforcement'],
      legal: true,
      source: 'pen-and-sword',
      explanation: { summary: 'generate.report routed through garvis-enforcement' },
    },
  }))

  assert.equal(trace?.routingId, 'plan-1')
  assert.equal(trace?.routingReason, 'generate.report routed through garvis-enforcement')
  assert.deepEqual(trace?.topologyLineage, ['garvis-enforcement'])
})

test('routing trace reconstruction is deterministic', () => {
  const traces = reconstructRoutingTraces([
    event({
      id: 'evt-route',
      replaySequence: 1,
      type: 'operator.analysis.completed',
      createdAt: '2026-05-27T00:00:00.000Z',
      payload: { action: 'generate.report', routingPlanId: 'plan-1', selectedOperators: ['garvis-enforcement'], explanation: { summary: 'ok' } },
    }),
  ])

  assert.equal(traces.length, 1)
  assert.equal(traces[0]?.routingId, 'plan-1')
})
