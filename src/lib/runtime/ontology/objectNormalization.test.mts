import test from 'node:test'
import assert from 'node:assert/strict'

import { normalizeReplayDerivedObject } from './objectNormalization'
import type { OperationalObject } from '../operationalState'
import type { RuntimeEvent } from '../runtimeTypes'

function event(input: Partial<RuntimeEvent> & Pick<RuntimeEvent, 'id' | 'type' | 'createdAt'>): RuntimeEvent {
  return {
    workspaceId: 'tela-showtela',
    replaySequence: 7,
    eventVersion: 1,
    schemaVersion: 'runtime.v1',
    source: 'system',
    governanceState: 'approved',
    executionState: 'completed',
    payload: {},
    ...input,
  }
}

test('normalizeReplayDerivedObject preserves canonical identity and deterministic diagnostics', () => {
  const object: OperationalObject = {
    id: 'entity:person:jon-hartman',
    objectType: 'entity',
    lineageId: 'lineage-a',
    status: 'active',
    createdAt: '2026-05-27T12:00:00.000Z',
    updatedAt: '2026-05-27T12:00:00.000Z',
    payload: {
      entityId: 'person:jon-hartman',
      threadId: 'thread-a',
    },
  }

  const normalized = normalizeReplayDerivedObject({
    object,
    event: event({
      id: 'evt-person',
      type: 'continuity.ingested',
      createdAt: '2026-05-27T12:00:00.000Z',
    }),
    replayConfirmed: true,
    lastConfirmedSequence: 7,
  })

  assert.equal(normalized.canonicalObjectId, object.id)
  assert.equal(normalized.ontologyType, 'person')
  assert.equal(normalized.lineageId, 'lineage-a')
  assert.equal(normalized.replayConfirmed, true)
  assert.equal(normalized.lastConfirmedSequence, 7)
  assert.equal(normalized.diagnostics.ontologyVersion, 'operational-ontology.v1')
  assert.equal(normalized.diagnostics.replayNormalizationPass, 'replay-normalization.v1')
  assert.equal(normalized.diagnostics.canonicalIdentitySource, 'entity-prefix')
})

test('normalizeReplayDerivedObject does not mutate canonical type across refresh', () => {
  const object: OperationalObject = {
    id: 'routing:plan-1',
    objectType: 'routing-plan',
    lineageId: 'lineage-a',
    status: 'approved',
    createdAt: '2026-05-27T12:00:00.000Z',
    updatedAt: '2026-05-27T12:00:00.000Z',
    payload: {
      routingPlanId: 'plan-1',
      action: 'continuity.promote',
    },
  }

  const incomingEvent = event({
    id: 'evt-route',
    type: 'routing.plan.created',
    createdAt: '2026-05-27T12:00:00.000Z',
  })

  const first = normalizeReplayDerivedObject({
    object,
    event: incomingEvent,
    replayConfirmed: false,
  })
  const second = normalizeReplayDerivedObject({
    object,
    event: incomingEvent,
    replayConfirmed: false,
  })

  assert.equal(first.ontologyType, 'operational-task')
  assert.deepEqual(first, second)
})
