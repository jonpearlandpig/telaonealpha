import assert from 'node:assert/strict'
import test from 'node:test'
import { buildShowTelaVMFromHydratedState } from './buildViewModel'
import type { HydratedRuntimeState } from '@/lib/runtime/runtimeHydrationModel'

test('buildShowTelaVMFromHydratedState projects anchors and calendar events from artifacts', () => {
  const state = {
    activeProjects: [],
    activeEntities: [],
    latestLineage: [],
    pinnedContinuity: [],
    recentDecisions: [],
    operationalObjects: [],
    routingPlans: [],
    lineageGraph: [],
    governanceLegality: [],
    operationalProjection: { blockers: [], movement: [], readiness: [] },
    artifacts: [{
      id: 'artifact-1',
      title: 'Positive Rocks Upload',
      threadId: 'thread-1',
      sessionId: 'session-1',
      text: [
        '# DIRECTORY',
        '## SHOWTELA OPERATIONS',
        '| Role | Name |',
        '|---|---|',
        '| Runtime Lead | Jon Hartman |',
        '',
        '## TOUR CALENDAR',
        '| Date | Time | Event | Location |',
        '|---|---|---|---|',
        '| Mon 1/18/27 | 10:00 AM | Band Rehearsal Day 1 | Sound Emporium |',
      ].join('\n'),
      createdAt: '2027-01-01T00:00:00.000Z',
    }],
    snapshots: [],
    entities: [],
    unresolved: {
      unresolvedThreads: [],
      unansweredQuestions: [],
      stalledProjects: [],
      incompleteArtifacts: [],
      pendingLineageChains: [],
    },
    replay: { state: { activeProjects: [] } },
    diagnostics: {
      runtimeAuthoritySource: 'hydrateRuntime',
      projectionBuiltFrom: 'events',
      hydrationReplaySequence: undefined,
      objectConfirmationCount: 0,
      unconfirmedObjectCount: 0,
      replayChecksum: 'a',
      restorationChecksum: 'b',
      replayConverged: true,
      hydrationPassCount: 1,
      replayDriftDetected: false,
      deterministicRestoration: true,
      reconciliationConflictCount: 0,
      graphAssemblyAgeMs: undefined,
      hydratedAt: '2027-01-01T00:00:00.000Z',
    },
  } as unknown as HydratedRuntimeState

  const vm = buildShowTelaVMFromHydratedState(state)

  assert.equal(vm.activeOps.length, 1)
  assert.equal(vm.activeOps[0]?.name, 'Jon Hartman')
  assert.equal(vm.calendarEvents?.length, 1)
  assert.equal(vm.calendarEvents?.[0]?.title, 'Band Rehearsal Day 1')
})

test('buildShowTelaVMFromHydratedState treats top-level markdown headings as proof sections', () => {
  const state = {
    activeProjects: [],
    activeEntities: [],
    latestLineage: [],
    pinnedContinuity: [],
    recentDecisions: [],
    operationalObjects: [],
    routingPlans: [],
    lineageGraph: [],
    governanceLegality: [],
    operationalProjection: { blockers: [], movement: [], readiness: [] },
    artifacts: [{
      id: 'artifact-proof',
      title: 'June 1 Proof Upload',
      threadId: 'thread-proof',
      sessionId: 'session-proof',
      text: [
        '# POSITIVE ROCKS — SPRING 2027 ARENA TOUR',
        '# SHOWTELA OPERATIONS',
        '| Role | Name |',
        '|---|---|',
        '| Runtime Lead | Jon Hartman |',
        '',
        '# MUSIC REHEARSALS',
        '| Date | Time | Event | Location |',
        '|---|---|---|---|',
        '| Mon 1/18/27 | 10:00 AM | Band Rehearsal Day 1 | Sound Emporium |',
      ].join('\n'),
      createdAt: '2027-01-01T00:00:00.000Z',
    }],
    snapshots: [],
    entities: [],
    unresolved: {
      unresolvedThreads: [],
      unansweredQuestions: [],
      stalledProjects: [],
      incompleteArtifacts: [],
      pendingLineageChains: [],
    },
    replay: { state: { activeProjects: [] } },
    diagnostics: {
      runtimeAuthoritySource: 'hydrateRuntime',
      projectionBuiltFrom: 'events',
      hydrationReplaySequence: undefined,
      objectConfirmationCount: 0,
      unconfirmedObjectCount: 0,
      replayChecksum: 'a',
      restorationChecksum: 'b',
      replayConverged: true,
      hydrationPassCount: 1,
      replayDriftDetected: false,
      deterministicRestoration: true,
      reconciliationConflictCount: 0,
      graphAssemblyAgeMs: undefined,
      hydratedAt: '2027-01-01T00:00:00.000Z',
    },
  } as unknown as HydratedRuntimeState

  const vm = buildShowTelaVMFromHydratedState(state)

  assert.equal(vm.activeOps[0]?.name, 'Jon Hartman')
  assert.equal(vm.crusadeOperations[0]?.name, 'SHOWTELA OPERATIONS')
  assert.equal(vm.calendarEvents?.[0]?.title, 'Band Rehearsal Day 1')
  assert.equal(vm.calendarEvents?.[0]?.departments?.[0], 'MUSIC REHEARSALS')
})
