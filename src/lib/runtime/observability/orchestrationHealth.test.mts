import test from 'node:test'
import assert from 'node:assert/strict'

import type { RuntimeEvent } from '../runtimeTypes'
import { buildOrchestrationHealth } from './orchestrationHealth'

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

test('orchestration health aggregates invocation and recommendation telemetry', () => {
  const output = buildOrchestrationHealth({
    workspaceId: 'tela-showtela',
    events: [
      event({ id: 'evt-1', replaySequence: 1, type: 'operator.analysis.completed', createdAt: '2026-05-27T00:00:00.000Z', payload: { action: 'generate.report', routingPlanId: 'plan-1', selectedOperators: ['garvis-enforcement'], legal: true, explanation: { summary: 'ok' } } }),
      event({ id: 'evt-2', replaySequence: 2, type: 'operator.recommendation.generated', createdAt: '2026-05-27T00:00:01.000Z', payload: { action: 'generate.report' } }),
      event({ id: 'evt-3', replaySequence: 3, type: 'operator.invoked', createdAt: '2026-05-27T00:00:02.000Z', payload: { action: 'generate.report', operatorId: 'garvis-enforcement' } }),
    ],
  })

  assert.equal(output.invocationCounts, 1)
  assert.equal(output.recommendationGeneration, 1)
})
