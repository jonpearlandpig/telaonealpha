import assert from 'node:assert/strict'
import test from 'node:test'

import { buildReadinessReviewsFromEvents } from './readiness'
import type { RuntimeEvent } from '@/lib/runtime/runtimeTypes'

function makeEvent(input: Partial<RuntimeEvent> & Pick<RuntimeEvent, 'id' | 'type' | 'createdAt'>): RuntimeEvent {
  return {
    workspaceId: 'tela-showtela',
    replaySequence: 1,
    eventVersion: 1,
    schemaVersion: 'runtime.v1',
    source: 'system',
    governanceState: 'approved',
    executionState: 'completed',
    payloadType: 'showtela.readiness.review',
    payload: {},
    ...input,
  }
}

test('buildReadinessReviewsFromEvents preserves readiness history in replay order', () => {
  const reviews = buildReadinessReviewsFromEvents([
    makeEvent({
      id: 'evt-1',
      replaySequence: 3,
      type: 'showtela.readiness.review.created',
      createdAt: '2026-05-31T10:00:00.000Z',
      payload: {
        reviewId: 'review-1',
        showTelaId: 'show-1',
        title: 'Launch Readiness',
        description: 'First constitutional review.',
        owner: 'Jon Hartman',
        status: 'RED',
        reviewDate: '2026-05-31',
        scope: 'June 8 show',
        sections: {
          greenItems: [],
          yellowItems: [],
          redItems: ['Venue contract missing'],
          blockingItems: ['Venue contract missing'],
          recommendedActions: ['Secure countersigned contract'],
          notes: 'Initial review.',
        },
        evidenceLinks: [
          { id: 'artifact-1', kind: 'artifact', refId: 'artifact-1', label: 'Venue contract draft' },
        ],
        historyEntry: {
          id: 'hist-1',
          status: 'RED',
          summary: 'Blocking venue contract.',
          blockingItems: ['Venue contract missing'],
          recordedAt: '2026-05-31T10:00:00.000Z',
        },
      },
    }),
    makeEvent({
      id: 'evt-2',
      replaySequence: 8,
      type: 'showtela.readiness.review.updated',
      createdAt: '2026-06-03T10:00:00.000Z',
      payload: {
        reviewId: 'review-1',
        showTelaId: 'show-1',
        title: 'Launch Readiness',
        description: 'Contract received; staffing still open.',
        owner: 'Jon Hartman',
        status: 'YELLOW',
        reviewDate: '2026-06-03',
        scope: 'June 8 show',
        sections: {
          greenItems: ['Venue contract received'],
          yellowItems: ['Crew staffing unresolved'],
          redItems: [],
          blockingItems: ['Crew staffing unresolved'],
          recommendedActions: ['Lock local crew'],
          notes: 'Midpoint review.',
        },
        evidenceLinks: [
          { id: 'event-1', kind: 'continuity_event', refId: 'evt-contract', label: 'Contract received' },
        ],
        historyEntry: {
          id: 'hist-2',
          status: 'YELLOW',
          summary: 'Contract received; staffing unresolved.',
          blockingItems: ['Crew staffing unresolved'],
          recordedAt: '2026-06-03T10:00:00.000Z',
        },
      },
    }),
    makeEvent({
      id: 'evt-3',
      replaySequence: 13,
      type: 'showtela.readiness.review.updated',
      createdAt: '2026-06-08T10:00:00.000Z',
      payload: {
        reviewId: 'review-1',
        showTelaId: 'show-1',
        title: 'Launch Readiness',
        description: 'All blockers cleared.',
        owner: 'Jon Hartman',
        status: 'GREEN',
        reviewDate: '2026-06-08',
        scope: 'June 8 show',
        sections: {
          greenItems: ['Venue contract received', 'Crew staffing locked'],
          yellowItems: [],
          redItems: [],
          blockingItems: [],
          recommendedActions: ['Proceed with final confirmation'],
          notes: 'Ready to execute.',
        },
        evidenceLinks: [
          { id: 'calendar-1', kind: 'calendar_event', refId: 'cal-1', label: 'Final confirmation call' },
        ],
        historyEntry: {
          id: 'hist-3',
          status: 'GREEN',
          summary: 'All blockers cleared.',
          blockingItems: [],
          recordedAt: '2026-06-08T10:00:00.000Z',
        },
      },
    }),
  ], { showTelaId: 'show-1' })

  assert.equal(reviews.length, 1)
  assert.equal(reviews[0]?.status, 'GREEN')
  assert.equal(reviews[0]?.history.length, 3)
  assert.deepEqual(
    reviews[0]?.history.map((entry) => `${entry.recordedAt}:${entry.status}`),
    [
      '2026-05-31T10:00:00.000Z:RED',
      '2026-06-03T10:00:00.000Z:YELLOW',
      '2026-06-08T10:00:00.000Z:GREEN',
    ],
  )
})
