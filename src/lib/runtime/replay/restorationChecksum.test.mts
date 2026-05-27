import test from 'node:test'
import assert from 'node:assert/strict'

import { buildCanonicalObjectsFromReplay } from '../objects/objectReplayPromotion'
import type { RuntimeEvent } from '../runtimeTypes'
import { createDeterministicRestorationChecksum } from './restorationChecksum'

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

test('createDeterministicRestorationChecksum is stable across identical replay input', () => {
  const events = [
    event({
      id: 'evt-1',
      replaySequence: 1,
      type: 'routing.plan.created',
      createdAt: '2026-05-27T12:00:00.000Z',
      payload: {
        routingPlanId: 'plan-1',
        action: 'continuity.promote',
        rollbackClass: 'soft',
        governanceState: 'approved',
      },
    }),
  ]

  const first = createDeterministicRestorationChecksum(
    buildCanonicalObjectsFromReplay('tela-showtela', events),
  )
  const second = createDeterministicRestorationChecksum(
    buildCanonicalObjectsFromReplay('tela-showtela', [...events].reverse()),
  )

  assert.equal(first, second)
})
