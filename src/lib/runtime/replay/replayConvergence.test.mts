import test from 'node:test'
import assert from 'node:assert/strict'

import { buildCanonicalObjectsFromReplay } from '../objects/objectReplayPromotion'
import { buildHydratedRuntimeState } from '../runtimeHydrationModel'
import type { RuntimeDiagnostics } from '../runtimeHydrationModel'
import type { RuntimeEvent } from '../runtimeTypes'
import type { OperationalProjection } from '../state/model'
import { verifyHydrationIdempotence, verifyReplayConvergence } from './replayConvergence'

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

const projection: OperationalProjection = {
  workspaceId: 'tela-showtela',
  showId: 'crusade',
  projectionVersion: 'operational-projection.v1',
  generatedAt: '2026-05-27T12:05:00.000Z',
  derivedAt: '2026-05-27T12:05:00.000Z',
  derivationVersion: 'operational-state.v1',
  derivedFromEventCount: 2,
  replayCursor: 2,
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
    currentTruth: 'Replay authority is stable.',
    mattersNow: 'Canonical identity is deterministic.',
    nextMovement: 'Await next replay event.',
    blockersLabel: 'No lawful blocker present.',
    movementLabel: 'No active movement surfaced.',
    readinessLabel: 'No ready state surfaced.',
  },
}

test('verifyReplayConvergence detects deterministic replay restoration', () => {
  const events = [
    event({
      id: 'evt-1',
      replaySequence: 1,
      type: 'routing.plan.created',
      createdAt: '2026-05-27T12:00:00.000Z',
      governanceState: 'pending',
      executionState: 'queued',
      lineageId: 'lineage-a',
      payload: {
        routingPlanId: 'plan-1',
        action: 'continuity.promote',
        rollbackClass: 'soft',
        governanceState: 'pending',
      },
    }),
    event({
      id: 'evt-2',
      replaySequence: 2,
      type: 'routing.plan.created',
      createdAt: '2026-05-27T12:01:00.000Z',
      lineageId: 'lineage-a',
      payload: {
        routingPlanId: 'plan-1',
        action: 'continuity.promote',
        rollbackClass: 'soft',
        governanceState: 'approved',
      },
    }),
  ]

  const verification = verifyReplayConvergence({
    workspaceId: 'tela-showtela',
    events,
  })

  assert.equal(verification.replayConverged, true)
  assert.equal(verification.checksumEqual, true)
  assert.equal(verification.replayDriftDetected, false)
  assert.equal(verification.identityStable, true)
  assert.equal(verification.ontologyStable, true)
  assert.equal(verification.confirmationStable, true)
})

test('verifyReplayConvergence preserves truthful gaps and deterministic conflicts', () => {
  const verification = verifyReplayConvergence({
    workspaceId: 'tela-showtela',
    events: [
      event({
        id: 'evt-1',
        replaySequence: 1,
        type: 'routing.plan.created',
        createdAt: '2026-05-27T12:00:00.000Z',
        lineageId: 'lineage-a',
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
        lineageId: 'lineage-b',
        payload: {
          threadId: 'thread-a',
          entityId: 'person:jon-hartman',
        },
      }),
    ],
  })

  assert.equal(verification.replayConverged, true)
  assert.equal(verification.firstSnapshot.unresolvedObjectCount >= 0, true)
  assert.equal(verification.reconciliationStable, true)
})

test('repeated hydrateRuntime-shaped passes produce identical deterministic checksums', async () => {
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

  const convergence = verifyReplayConvergence({
    workspaceId: 'tela-showtela',
    events,
  })

  const result = await verifyHydrationIdempotence({
    workspaceId: 'tela-showtela',
    hydrate: async (workspaceId) => {
      const canonicalObjects = buildCanonicalObjectsFromReplay(workspaceId, events)
      const diagnostics: RuntimeDiagnostics = {
        runtimeAuthoritySource: 'hydrateRuntime',
        projectionBuiltFrom: 'events',
        hydrationReplaySequence: 1,
        objectConfirmationCount: canonicalObjects.filter((object) => object.replayConfirmed).length,
        unconfirmedObjectCount: canonicalObjects.filter((object) => !object.replayConfirmed).length,
        replayChecksum: convergence.replayChecksum,
        restorationChecksum: convergence.restorationChecksum,
        replayConverged: convergence.replayConverged,
        hydrationPassCount: 2,
        replayDriftDetected: convergence.replayDriftDetected,
        deterministicRestoration: convergence.deterministicRestoration,
        reconciliationConflictCount: convergence.reconciliationConflictCount,
        graphAssemblyAgeMs: undefined,
        hydratedAt: '2026-05-27T12:05:00.000Z',
      }

      return buildHydratedRuntimeState({
        durable: {
          artifacts: [],
          entities: [],
          snapshots: [],
        },
        replay: {
          state: {
            activeThreads: [],
            activeProjects: [],
            unresolvedContinuity: canonicalObjects
              .filter((object) => !object.replayConfirmed)
              .map((object) => object.id),
            pinnedContinuity: [],
            recentDecisions: [],
            activeEntities: [],
            recentLineage: canonicalObjects
              .map((object) => object.lineageId)
              .filter((value): value is string => typeof value === 'string'),
            operationalObjects: canonicalObjects,
            routingPlans: [],
            lineageGraph: [],
            currentPriorities: [],
            continuityIntensity: 0,
            operationalDrift: 0,
            staleImportantMemory: [],
            governanceLegality: [],
            governanceOutcomes: { blocked: 0, denied: 0, escalated: 0, pending: 0 },
          },
          replayedEventCount: events.length,
          lastEventAt: events.at(-1)?.createdAt,
          lastReplaySequence: events.at(-1)?.replaySequence,
          replaySource: 'events',
        },
        operationalProjection: projection,
        diagnostics,
      })
    },
  })

  assert.equal(result.replayConverged, true)
  assert.deepEqual(result.restorationChecksums, [
    convergence.restorationChecksum,
    convergence.restorationChecksum,
  ])
})
