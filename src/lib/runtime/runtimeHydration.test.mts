import test from 'node:test'
import assert from 'node:assert/strict'

import { buildHydratedRuntimeState } from './runtimeHydrationModel'
import type { ContinuitySnapshot } from './continuitySnapshots'
import type { OperationalProjection } from './state/model'

test('buildHydratedRuntimeState returns replay-derived projections only', () => {
  const snapshots: ContinuitySnapshot[] = [{
    id: 'snap-checkpoint',
    createdAt: '2026-05-24T17:40:00.000Z',
    snapshotKind: 'checkpoint',
    replaySource: 'runtime_events',
    replayedEventCount: 3,
    latestReplaySequence: 3,
    latestEventId: 'evt-3',
    latestEventAt: '2026-05-24T17:40:00.000Z',
    threadRefs: ['thread-a'],
    entityRefs: ['person:jon-hartman'],
    lineageRefs: ['lineage-a'],
    activeArtifacts: [],
    relatedEntities: [],
    unresolvedThreads: [],
    recentLineage: [],
    activeOperationalContexts: [],
    continuityMetadata: { unresolvedCount: 1, pinnedCount: 0, provenanceCount: 1, temporalWeight: 10 },
  }]

  const replayState = {
    activeThreads: ['thread-a'],
    activeProjects: ['project:crusade'],
    unresolvedContinuity: ['unresolved-a'],
    pinnedContinuity: ['pin-a'],
    recentDecisions: ['approved staffing'],
    activeEntities: ['person:jon-hartman'],
    recentLineage: ['lineage-a'],
    operationalObjects: [{
      id: 'thread:thread-a',
      objectType: 'continuity-thread' as const,
      status: 'active',
      createdAt: '2026-05-24T17:38:00.000Z',
      updatedAt: '2026-05-24T17:40:00.000Z',
      payload: { threadId: 'thread-a' },
    }],
    routingPlans: [],
    lineageGraph: [],
    currentPriorities: [{ id: 'unresolved-a', reason: 'unresolved continuity', score: 35 }],
    continuityIntensity: 12,
    operationalDrift: 0,
    staleImportantMemory: [],
    governanceLegality: [],
    governanceOutcomes: { blocked: 0, denied: 0, escalated: 0, pending: 0 },
  }

  const hydrated = buildHydratedRuntimeState({
    durable: {
      artifacts: [],
      entities: [],
      snapshots,
    },
    replay: {
      state: replayState,
      replayedEventCount: 3,
      lastEventAt: '2026-05-24T17:40:00.000Z',
      lastReplaySequence: 3,
      replaySource: 'events',
    },
    operationalProjection: {
      workspaceId: 'tela-showtela',
      showId: 'crusade',
      projectionVersion: 'operational-projection.v1',
      generatedAt: '2026-05-24T17:40:00.000Z',
      derivedAt: '2026-05-24T17:40:00.000Z',
      derivationVersion: 'operational-state.v1',
      derivedFromEventCount: 3,
      replayCursor: 3,
      states: [],
      blockers: [],
      movement: [],
      readiness: [],
      escalations: [],
      dependencyChains: [],
      groupedTopology: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        blockers: 0,
        movement: 0,
        readiness: 0,
        escalations: 0,
      },
      summary: {
        currentTruth: 'Operational field is calm.',
        mattersNow: 'No blocker chain has been materialized.',
        nextMovement: 'Await next runtime movement.',
        blockersLabel: 'No blocker currently dominates.',
        movementLabel: 'No active movement surfaced.',
        readinessLabel: 'No ready state surfaced.',
      },
    } satisfies OperationalProjection,
  })

  assert.deepEqual(hydrated.activeProjects, ['project:crusade'])
  assert.deepEqual(hydrated.activeEntities, ['person:jon-hartman'])
  assert.deepEqual(hydrated.pinnedContinuity, ['pin-a'])
  assert.deepEqual(hydrated.recentDecisions, ['approved staffing'])
  assert.deepEqual(hydrated.latestLineage, ['lineage-a'])
  assert.deepEqual(hydrated.unresolved.incompleteArtifacts, ['unresolved-a'])
  assert.equal(hydrated.operationalObjects.length, 1)
  assert.equal(hydrated.operationalProjection.projectionVersion, 'operational-projection.v1')
  assert.equal(hydrated.replay.replaySource, 'events')
})
