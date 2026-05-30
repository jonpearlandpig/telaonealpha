import test from 'node:test'
import assert from 'node:assert/strict'

import { buildCanonicalObjectsFromReplay } from '../objects/objectReplayPromotion'
import { buildHydratedRuntimeState } from '../runtimeHydrationModel'
import type { RuntimeDiagnostics } from '../runtimeHydrationModel'
import type { RuntimeEvent } from '../runtimeTypes'
import type { OperationalProjection } from '../state/model'

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

const diagnostics: RuntimeDiagnostics = {
  runtimeAuthoritySource: 'hydrateRuntime',
  projectionBuiltFrom: 'events',
  hydrationReplaySequence: 2,
  objectConfirmationCount: 1,
  unconfirmedObjectCount: 0,
  replayChecksum: 'checksum-a',
  restorationChecksum: 'checksum-a',
  replayConverged: true,
  hydrationPassCount: 2,
  replayDriftDetected: false,
  deterministicRestoration: true,
  reconciliationConflictCount: 0,
  graphAssemblyAgeMs: undefined,
  hydratedAt: '2026-05-27T12:05:00.000Z',
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

test('buildCanonicalObjectsFromReplay preserves identity and confirmation across replay refresh', () => {
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

  const first = buildCanonicalObjectsFromReplay('tela-showtela', events)
  const second = buildCanonicalObjectsFromReplay('tela-showtela', events)
  const task = first.find((object) => object.id === 'routing:plan-1')

  assert.deepEqual(first, second)
  assert.ok(task)
  assert.equal(task.replayConfirmed, true)
  assert.equal(task.lastConfirmedSequence, 2)
  assert.equal(task.payload.canonicalType, 'operational-task')
  assert.equal(task.payload.ontologyVersion, 'operational-ontology.v1')
})

test('unconfirmed replay objects remain unresolved and hydration stays stable', () => {
  const objects = buildCanonicalObjectsFromReplay('tela-showtela', [
    event({
      id: 'evt-1',
      replaySequence: 1,
      type: 'routing.plan.created',
      createdAt: '2026-05-27T12:00:00.000Z',
      governanceState: 'pending',
      executionState: 'queued',
      lineageId: 'lineage-a',
      payload: {
        routingPlanId: 'plan-gap',
        action: 'continuity.promote',
        rollbackClass: 'soft',
        governanceState: 'pending',
      },
    }),
  ])

  const hydrated = buildHydratedRuntimeState({
    durable: {
      artifacts: [],
      entities: [],
      snapshots: [],
    },
    replay: {
      state: {
        activeThreads: ['thread-a'],
        activeProjects: ['project:crusade'],
        unresolvedContinuity: ['routing:plan-gap'],
        pinnedContinuity: [],
        recentDecisions: [],
        activeEntities: [],
        recentLineage: ['lineage-a'],
        operationalObjects: objects,
        routingPlans: [],
        lineageGraph: [],
        currentPriorities: [],
        continuityIntensity: 1,
        operationalDrift: 0,
        staleImportantMemory: [],
        governanceLegality: [],
        governanceOutcomes: { blocked: 0, denied: 0, escalated: 0, pending: 1 },
      },
      replayedEventCount: 1,
      lastEventAt: '2026-05-27T12:00:00.000Z',
      lastReplaySequence: 1,
      replaySource: 'events',
    },
    operationalProjection: projection,
    diagnostics,
  })

  assert.equal(objects[0]?.replayConfirmed, false)
  assert.equal(objects[0]?.payload.canonicalType, 'operational-task')
  assert.equal(hydrated.operationalObjects[0]?.id, 'routing:plan-gap')
  assert.equal(hydrated.operationalObjects[0]?.payload.canonicalType, 'operational-task')
})
