import test from 'node:test'
import assert from 'node:assert/strict'

import { buildCanonicalObjectsFromReplay } from './objectReplayPromotion'
import type { RuntimeEvent } from '../runtimeTypes'

function makeEvent(input: Partial<RuntimeEvent> & Pick<RuntimeEvent, 'id' | 'type' | 'governanceState' | 'executionState' | 'createdAt'>): RuntimeEvent {
  return {
    workspaceId: 'tela-showtela',
    replaySequence: 1,
    eventVersion: 1,
    schemaVersion: 'runtime.v1',
    source: 'operator',
    payloadType: 'runtime.test',
    payload: {},
    ...input,
  }
}

test('buildCanonicalObjectsFromReplay keeps proposal-only objects unconfirmed', () => {
  const objects = buildCanonicalObjectsFromReplay('tela-showtela', [
    makeEvent({
      id: 'evt-pending',
      replaySequence: 4,
      type: 'routing.plan.created',
      governanceState: 'pending',
      executionState: 'queued',
      createdAt: '2026-05-27T10:00:00.000Z',
      payload: {
        routingPlanId: 'plan-proposed',
        action: 'continuity.promote',
        rollbackClass: 'soft',
        governanceState: 'pending',
      },
    }),
  ])

  const routingPlan = objects.find((object) => object.id === 'routing:plan-proposed')
  assert.ok(routingPlan)
  assert.equal(routingPlan.replayConfirmed, false)
  assert.equal(routingPlan.lastConfirmedSequence, undefined)
  assert.equal(routingPlan.provenance.createdBy, 'ingest')
  assert.deepEqual(routingPlan.provenance.confirmedBy, undefined)
})

test('buildCanonicalObjectsFromReplay preserves identity and confirms once replay approves', () => {
  const objects = buildCanonicalObjectsFromReplay('tela-showtela', [
    makeEvent({
      id: 'evt-pending',
      replaySequence: 4,
      type: 'routing.plan.created',
      governanceState: 'pending',
      executionState: 'queued',
      createdAt: '2026-05-27T10:00:00.000Z',
      lineageId: 'lineage-1',
      payload: {
        routingPlanId: 'plan-proposed',
        action: 'continuity.promote',
        rollbackClass: 'soft',
        governanceState: 'pending',
      },
    }),
    makeEvent({
      id: 'evt-approved',
      replaySequence: 8,
      type: 'routing.plan.created',
      governanceState: 'approved',
      executionState: 'queued',
      createdAt: '2026-05-27T10:05:00.000Z',
      lineageId: 'lineage-1',
      payload: {
        routingPlanId: 'plan-proposed',
        action: 'continuity.promote',
        rollbackClass: 'soft',
        governanceState: 'approved',
        escalationPath: ['mose-router'],
      },
    }),
  ])

  const routingPlan = objects.find((object) => object.id === 'routing:plan-proposed')
  assert.ok(routingPlan)
  assert.equal(routingPlan.replayConfirmed, true)
  assert.equal(routingPlan.lastConfirmedSequence, 8)
  assert.equal(routingPlan.provenance.originEventId, 'evt-pending')
  assert.deepEqual(routingPlan.provenance.confirmedBy, ['evt-approved'])
  assert.equal(routingPlan.payload.governanceState, 'approved')
})

test('buildCanonicalObjectsFromReplay promotes readiness reviews as canonical objects', () => {
  const objects = buildCanonicalObjectsFromReplay('tela-showtela', [
    makeEvent({
      id: 'evt-readiness',
      replaySequence: 11,
      type: 'showtela.readiness.review.created',
      governanceState: 'approved',
      executionState: 'completed',
      createdAt: '2026-05-31T12:00:00.000Z',
      lineageId: 'review-lineage-1',
      payload: {
        reviewId: 'review-1',
        showTelaId: 'show-1',
        title: 'Launch Readiness',
        owner: 'Jon Hartman',
        status: 'YELLOW',
        reviewDate: '2026-05-31',
        scope: 'June 8 show',
        sections: {
          greenItems: [],
          yellowItems: ['Crew staffing unresolved'],
          redItems: [],
          blockingItems: ['Crew staffing unresolved'],
          recommendedActions: ['Lock local crew'],
          notes: '',
        },
        evidenceLinks: [
          { id: 'entity-1', kind: 'entity', refId: 'crew-chief', label: 'Crew Chief' },
        ],
        historyEntry: {
          id: 'hist-1',
          status: 'YELLOW',
          summary: 'Crew staffing unresolved.',
          blockingItems: ['Crew staffing unresolved'],
          recordedAt: '2026-05-31T12:00:00.000Z',
        },
      },
    }),
  ])

  const review = objects.find((object) => object.id === 'readiness-review:review-1')
  assert.ok(review)
  assert.equal(review.objectType, 'readiness-review')
  assert.equal(review.status, 'YELLOW')
  assert.equal(review.payload.title, 'Launch Readiness')
  assert.equal(review.replayConfirmed, true)
})
