import test from 'node:test'
import assert from 'node:assert/strict'

import { buildCanonicalObjectsFromReplay } from '../objects/objectReplayPromotion'
import type { RuntimeEvent } from '../runtimeTypes'
import { createRestorationSnapshot } from './restorationSnapshot'

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

test('createRestorationSnapshot derives deterministic restoration counts from canonical state', () => {
  const objects = buildCanonicalObjectsFromReplay('tela-showtela', [
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
    event({
      id: 'evt-2',
      replaySequence: 2,
      type: 'continuity.ingested',
      createdAt: '2026-05-27T12:01:00.000Z',
      governanceState: 'pending',
      executionState: 'queued',
      lineageId: 'lineage-gap',
      payload: {
        threadId: 'thread-gap',
        unresolvedId: 'unresolved-gap',
      },
    }),
  ])

  const snapshot = createRestorationSnapshot({
    workspaceId: 'tela-showtela',
    canonicalObjects: objects,
  })

  assert.equal(snapshot.workspaceId, 'tela-showtela')
  assert.equal(snapshot.ontologyVersion, 'operational-ontology.v1')
  assert.equal(snapshot.canonicalObjectCount, objects.length)
  assert.equal(snapshot.confirmedObjectCount, objects.filter((object) => object.replayConfirmed).length)
  assert.equal(snapshot.unresolvedObjectCount, objects.filter((object) => !object.replayConfirmed).length)
  assert.equal(snapshot.replaySequenceRange.first, 1)
  assert.equal(snapshot.replaySequenceRange.last, 1)
})
