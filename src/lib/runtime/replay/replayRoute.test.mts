import test from 'node:test'
import assert from 'node:assert/strict'

import { buildReplayRoutePayload } from './replayRoutePayload'
import type { RuntimeEvent } from '../runtimeTypes'

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

test('replay route payload is deterministic and never mutates input state', () => {
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

  const original = JSON.stringify(events)
  const first = buildReplayRoutePayload({
    workspaceId: 'tela-showtela',
    events,
  })
  const second = buildReplayRoutePayload({
    workspaceId: 'tela-showtela',
    events,
  })

  assert.deepEqual(first, second)
  assert.equal(JSON.stringify(events), original)
  assert.equal(first.replayAuthorityMetadata.routeMode, 'read-only')
})
