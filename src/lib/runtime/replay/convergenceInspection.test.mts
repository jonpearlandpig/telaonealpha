import test from 'node:test'
import assert from 'node:assert/strict'

import type { RuntimeEvent } from '../runtimeTypes'
import { inspectReplayConvergence } from './convergenceInspection'

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

test('truthful gaps preserved across refresh remain inspectable', () => {
  const inspection = inspectReplayConvergence({
    workspaceId: 'tela-showtela',
    events: [
      event({
        id: 'evt-1',
        replaySequence: 1,
        type: 'routing.plan.created',
        createdAt: '2026-05-27T12:00:00.000Z',
        governanceState: 'pending',
        executionState: 'queued',
        lineageId: 'lineage-gap',
        payload: {
          routingPlanId: 'plan-gap',
          action: 'continuity.promote',
          rollbackClass: 'soft',
          governanceState: 'pending',
        },
      }),
    ],
  })

  assert.deepEqual(inspection.failedConvergenceObjectIds, [])
  assert.deepEqual(inspection.unresolvedGapObjectIds, ['routing:plan-gap'])
})
