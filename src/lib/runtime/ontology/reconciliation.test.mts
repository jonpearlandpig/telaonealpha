import test from 'node:test'
import assert from 'node:assert/strict'

import { normalizeReplayDerivedObject } from './objectNormalization'
import { reconcileNormalizedObjects } from './reconciliation'
import type { OperationalObject } from '../operationalState'
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

function normalize(input: {
  object: OperationalObject
  event: RuntimeEvent
  replayConfirmed: boolean
  lastConfirmedSequence?: number
}) {
  return normalizeReplayDerivedObject(input)
}

test('reconcileNormalizedObjects is deterministic and preserves lawful gaps', () => {
  const baseObject: OperationalObject = {
    id: 'routing:plan-1',
    objectType: 'routing-plan',
    lineageId: 'lineage-a',
    status: 'pending',
    createdAt: '2026-05-27T12:00:00.000Z',
    updatedAt: '2026-05-27T12:00:00.000Z',
    payload: { routingPlanId: 'plan-1', action: 'continuity.promote' },
  }

  const first = normalize({
    object: baseObject,
    event: event({
      id: 'evt-1',
      replaySequence: 1,
      type: 'routing.plan.created',
      createdAt: '2026-05-27T12:00:00.000Z',
    }),
    replayConfirmed: false,
  })

  const second = normalize({
    object: {
      ...baseObject,
      status: 'approved',
      updatedAt: '2026-05-27T12:01:00.000Z',
      payload: { routingPlanId: 'plan-1', action: 'continuity.promote', escalationPath: ['mose-router'] },
    },
    event: event({
      id: 'evt-2',
      replaySequence: 2,
      type: 'routing.plan.created',
      createdAt: '2026-05-27T12:01:00.000Z',
    }),
    replayConfirmed: true,
    lastConfirmedSequence: 2,
  })

  const conflict = normalize({
    object: {
      ...baseObject,
      objectType: 'entity',
      payload: { entityId: 'person:jon-hartman' },
    },
    event: event({
      id: 'evt-3',
      replaySequence: 3,
      type: 'continuity.ingested',
      createdAt: '2026-05-27T12:02:00.000Z',
    }),
    replayConfirmed: true,
    lastConfirmedSequence: 3,
  })

  assert.equal(reconcileNormalizedObjects(first, first).decision, 'same-object')
  assert.equal(reconcileNormalizedObjects(first, second).decision, 'superseded-object')
  assert.equal(reconcileNormalizedObjects(first, conflict).decision, 'conflicting-object')
  assert.equal(reconcileNormalizedObjects(first, second).diagnostics.reconciliationSource, 'deterministic-reconciliation.v1')
})
