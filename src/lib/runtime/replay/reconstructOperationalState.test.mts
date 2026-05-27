import test from 'node:test'
import assert from 'node:assert/strict'

import { ACTIONS } from '../actions'
import { createReplayCheckpointSnapshot } from '../continuitySnapshots'
import { reconstructOperationalStateFromReplay } from './reconstructOperationalState'
import type { RuntimeEvent } from '../runtimeTypes'

function event(input: Partial<RuntimeEvent> & Pick<RuntimeEvent, 'id' | 'type' | 'createdAt' | 'replaySequence'>): RuntimeEvent {
  return {
    id: input.id,
    workspaceId: input.workspaceId ?? 'tela-showtela',
    replaySequence: input.replaySequence,
    type: input.type,
    eventVersion: 1,
    schemaVersion: 'runtime.v1',
    source: input.source ?? 'system',
    governanceState: input.governanceState ?? 'approved',
    executionState: input.executionState ?? 'completed',
    traceId: input.traceId,
    correlationId: input.correlationId,
    lineageId: input.lineageId,
    payloadType: input.payloadType,
    createdAt: input.createdAt,
    payload: input.payload,
  }
}

test('reconstructOperationalStateFromReplay orders strictly by replaySequence and preserves unresolved continuity resolution', () => {
  const replayed = reconstructOperationalStateFromReplay([
    event({
      id: 'evt-3',
      replaySequence: 3,
      type: ACTIONS.RESOLVE_UNRESOLVED,
      createdAt: '2026-05-24T17:38:00.000Z',
      lineageId: 'lineage-a',
      payload: { threadId: 'thread-a', unresolvedId: 'unresolved-a' },
    }),
    event({
      id: 'evt-1',
      replaySequence: 1,
      type: ACTIONS.CREATE_UNRESOLVED,
      createdAt: '2026-05-24T17:40:00.000Z',
      lineageId: 'lineage-a',
      payload: { threadId: 'thread-a', unresolvedId: 'unresolved-a', entityId: 'person:jon-hartman' },
    }),
    event({
      id: 'evt-2',
      replaySequence: 2,
      type: 'operator.blocked',
      createdAt: '2026-05-24T17:39:00.000Z',
      lineageId: 'lineage-a',
      payload: { threadId: 'thread-a', linkedEntities: ['project:crusade'] },
    }),
  ])

  assert.equal(replayed.replaySource, 'events')
  assert.equal(replayed.replayedEventCount, 3)
  assert.equal(replayed.lastReplaySequence, 3)
  assert.deepEqual(replayed.state.unresolvedContinuity, [])
  assert.deepEqual(replayed.state.activeProjects, ['project:crusade'])
  assert.equal(replayed.state.governanceOutcomes?.blocked, 1)
  assert.equal(replayed.state.operationalObjects.some((item) => item.objectType === 'governance'), true)
  assert.deepEqual(replayed.state.recentLineage, ['lineage-a'])
})

test('reconstructOperationalStateFromReplay ignores snapshot checkpoint state as runtime authority', () => {
  const events = [
    event({
      id: 'evt-10',
      replaySequence: 10,
      type: 'continuity.ingested',
      createdAt: '2026-05-24T17:38:00.000Z',
      lineageId: 'lineage-live',
      payload: { threadId: 'thread-live', unresolvedId: 'unresolved-live' },
    }),
  ]

  const baseline = reconstructOperationalStateFromReplay(events)
  const checkpoint = createReplayCheckpointSnapshot({
    workspaceId: 'tela-showtela',
    threadId: 'thread-live',
    state: {
      ...baseline.state,
      activeThreads: ['thread-stale'],
      unresolvedContinuity: [],
      recentLineage: ['lineage-stale'],
    },
    events,
  })

  const replayed = reconstructOperationalStateFromReplay(events)

  assert.equal(checkpoint.latestReplaySequence, 10)
  assert.deepEqual(replayed.state.activeThreads, ['thread-live'])
  assert.deepEqual(replayed.state.recentLineage, ['lineage-live'])
  assert.deepEqual(replayed.state.unresolvedContinuity, ['unresolved-live'])
})

test('reconstructOperationalStateFromReplay preserves routing plans, legality checks, and lineage edges for orchestration replay', () => {
  const replayed = reconstructOperationalStateFromReplay([
    event({
      id: 'evt-route',
      replaySequence: 11,
      type: 'operator.analysis.completed',
      createdAt: '2026-05-26T15:29:00.000Z',
      lineageId: 'lineage-child',
      payload: {
        action: ACTIONS.GENERATE_REPORT,
        routingPlanId: 'plan-1',
        selectedOperators: ['mose-router', 'garvis-enforcement'],
        sequence: [{ order: 1, operatorId: 'mose-router', action: ACTIONS.GENERATE_REPORT }],
        rollbackClass: 'none',
        escalationPath: ['mose-router', 'flightpath-engine', 'garvis-enforcement'],
        governanceState: 'approved',
        legal: true,
        explanation: {
          summary: 'generate.report routed through mose-router',
          selectedBecause: ['mose-router matched generate.report'],
          triggeringSignals: [{ kind: 'action-capability', value: ACTIONS.GENERATE_REPORT, triggeredBy: 'Operators advertising generate.report' }],
          governancePath: ['mose-router', 'flightpath-engine', 'garvis-enforcement'],
        },
        requiredAuthority: 'S0',
        source: 'pen-and-sword',
        parentLineageId: 'lineage-root',
        rightsValidation: { allowed: true },
      },
    }),
  ])

  assert.equal(replayed.state.routingPlans.length, 1)
  assert.equal(replayed.state.routingPlans[0]?.id, 'plan-1')
  assert.deepEqual(replayed.state.routingPlans[0]?.escalationPath, ['mose-router', 'flightpath-engine', 'garvis-enforcement'])
  assert.equal(replayed.state.governanceLegality[0]?.source, 'pen-and-sword')
  assert.equal(replayed.state.lineageGraph[0]?.parentLineageId, 'lineage-root')
  assert.equal(replayed.state.operationalObjects.some((item) => item.objectType === 'routing-plan'), true)
  assert.equal(replayed.state.operationalObjects.some((item) => item.objectType === 'authorship-guard'), true)
})
