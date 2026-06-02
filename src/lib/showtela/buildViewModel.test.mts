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
    events: [
      {
        id: 'showtela-created',
        workspaceId: 'showtela-proof',
        replaySequence: 1,
        type: 'showtela.lifecycle.created',
        eventVersion: 1,
        schemaVersion: 'runtime.v1',
        source: 'system',
        governanceState: 'approved',
        executionState: 'completed',
        createdAt: '2027-01-01T00:00:00.000Z',
        payload: { showTelaName: 'Proof ShowTELA' },
      },
    ],
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
  assert.equal(vm.showTelaHealth.people, 1)
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
    events: [
      {
        id: 'showtela-created',
        workspaceId: 'showtela-proof',
        replaySequence: 1,
        type: 'showtela.lifecycle.created',
        eventVersion: 1,
        schemaVersion: 'runtime.v1',
        source: 'system',
        governanceState: 'approved',
        executionState: 'completed',
        createdAt: '2027-01-01T00:00:00.000Z',
        payload: { showTelaName: 'Proof ShowTELA' },
      },
      {
        id: 'artifact-uploaded',
        workspaceId: 'showtela-proof',
        replaySequence: 2,
        type: 'showtela.artifact.uploaded',
        eventVersion: 1,
        schemaVersion: 'runtime.v1',
        source: 'operator',
        governanceState: 'approved',
        executionState: 'completed',
        createdAt: '2027-01-01T00:01:00.000Z',
        payload: { insertedId: 'artifact-proof', submittedBy: 'Jon Hartman' },
      },
      {
        id: 'calendar-hydrated',
        workspaceId: 'showtela-proof',
        replaySequence: 3,
        type: 'showtela.calendar.hydrated',
        eventVersion: 1,
        schemaVersion: 'runtime.v1',
        source: 'operator',
        governanceState: 'approved',
        executionState: 'completed',
        createdAt: '2027-01-01T00:02:00.000Z',
        payload: { insertedId: 'artifact-proof', submittedBy: 'Jon Hartman' },
      },
    ],
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
  assert.equal(vm.calendarEvents?.[0]?.sourceArtifactId, 'artifact-proof')
  assert.equal(vm.calendarEvents?.[0]?.sourceArtifactTitle, 'June 1 Proof Upload')
  assert.equal(vm.calendarEvents?.[0]?.continuityEventId, 'calendar-hydrated')
  assert.equal(vm.calendarEvents?.[0]?.importedAt, '2027-01-01T00:02:00.000Z')
  assert.equal(vm.continuityTimeline[0]?.eventType, 'CALENDAR_HYDRATED')
  assert.equal(vm.continuityTimeline[0]?.telaWhy?.status, 'verified')
  assert.equal(vm.continuityTimeline[0]?.telaWhy?.sourceArtifact?.title, 'June 1 Proof Upload')
  assert.equal(vm.continuityTimeline[0]?.telaWhy?.importTimestamp, '2027-01-01T00:02:00.000Z')
  assert.deepEqual(vm.continuityTimeline[0]?.telaWhy?.linkedCalendarEvents, ['1 calendar event'])
  assert.equal(vm.showTelaHealth.calendarEvents, 1)
})

test('buildShowTelaVMFromHydratedState surfaces replayable readiness reviews', () => {
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
    artifacts: [],
    snapshots: [],
    entities: [],
    events: [
      {
        id: 'showtela-created',
        workspaceId: 'showtela-proof',
        replaySequence: 1,
        type: 'showtela.lifecycle.created',
        eventVersion: 1,
        schemaVersion: 'runtime.v1',
        source: 'system',
        governanceState: 'approved',
        executionState: 'completed',
        createdAt: '2027-01-01T00:00:00.000Z',
        payload: { showTelaName: 'Proof ShowTELA' },
      },
      {
        id: 'readiness-created',
        workspaceId: 'showtela-proof',
        replaySequence: 2,
        type: 'showtela.readiness.review.created',
        eventVersion: 1,
        schemaVersion: 'runtime.v1',
        source: 'system',
        governanceState: 'approved',
        executionState: 'completed',
        createdAt: '2027-01-02T00:00:00.000Z',
        payload: {
          reviewId: 'review-1',
          showTelaId: 'showtela-created',
          title: 'Launch Readiness',
          description: 'Initial review.',
          owner: 'Jon Hartman',
          status: 'RED',
          reviewDate: '2027-01-02',
          scope: 'Arena launch',
          sections: {
            greenItems: [],
            yellowItems: [],
            redItems: ['Venue contract missing'],
            blockingItems: ['Venue contract missing'],
            recommendedActions: ['Secure contract'],
            notes: 'Still blocked.',
          },
          evidenceLinks: [],
          historyEntry: {
            id: 'hist-1',
            status: 'RED',
            summary: 'Blocking venue contract.',
            blockingItems: ['Venue contract missing'],
            recordedAt: '2027-01-02T00:00:00.000Z',
          },
        },
      },
      {
        id: 'readiness-updated',
        workspaceId: 'showtela-proof',
        replaySequence: 3,
        type: 'showtela.readiness.review.updated',
        eventVersion: 1,
        schemaVersion: 'runtime.v1',
        source: 'system',
        governanceState: 'approved',
        executionState: 'completed',
        createdAt: '2027-01-03T00:00:00.000Z',
        payload: {
          reviewId: 'review-1',
          showTelaId: 'showtela-created',
          title: 'Launch Readiness',
          description: 'All blockers cleared.',
          owner: 'Jon Hartman',
          status: 'GREEN',
          reviewDate: '2027-01-03',
          scope: 'Arena launch',
          sections: {
            greenItems: ['Contract received'],
            yellowItems: [],
            redItems: [],
            blockingItems: [],
            recommendedActions: ['Proceed'],
            notes: 'Ready to move.',
          },
          evidenceLinks: [],
          historyEntry: {
            id: 'hist-2',
            status: 'GREEN',
            summary: 'All blockers cleared.',
            blockingItems: [],
            recordedAt: '2027-01-03T00:00:00.000Z',
          },
        },
      },
    ],
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
      hydratedAt: '2027-01-03T00:00:00.000Z',
    },
  } as unknown as HydratedRuntimeState

  const vm = buildShowTelaVMFromHydratedState(state)
  const readinessReviews = vm.readinessReviews ?? []

  assert.equal(readinessReviews.length, 1)
  assert.equal(readinessReviews[0]?.status, 'GREEN')
  assert.equal(readinessReviews[0]?.history.length, 2)
  assert.equal(readinessReviews[0]?.scope, 'Arena launch')
})
