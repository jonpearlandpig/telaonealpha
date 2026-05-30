import test from 'node:test'
import assert from 'node:assert/strict'

import type { RuntimeEvent } from '../runtimeTypes'
import { buildTraceObservability } from './traceObservability'

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

test('trace observability aggregates replay-safe orchestration telemetry', () => {
  const output = buildTraceObservability({
    workspaceId: 'tela-showtela',
    events: [
      event({
        id: 'evt-c',
        replaySequence: 1,
        type: 'constitutional.invoked',
        createdAt: '2026-05-27T00:00:00.000Z',
        source: 'system',
        payload: { constitutionalPath: ['telauthorium', 'pen-and-sword', 'the-ledger'] },
      }),
      event({
        id: 'evt-r',
        replaySequence: 2,
        type: 'operator.analysis.completed',
        createdAt: '2026-05-27T00:00:01.000Z',
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
        payload: { action: 'generate.report', operatorId: 'garvis-enforcement' },
      }),
    ],
  })

  assert.equal(output.constitutionalActivity, 1)
  assert.equal(output.routingFrequencies['generate.report'], 1)
  assert.equal(typeof output.replayReconstructionHealth.replayConverged, 'boolean')
})
