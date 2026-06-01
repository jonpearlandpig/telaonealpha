import test from 'node:test'
import assert from 'node:assert/strict'
import { buildShowTelaContinuityEvents, SHOWTELA_RUNTIME_EVENT_TYPES } from './continuityEvents'

test('buildShowTelaContinuityEvents turns upload and hydration evidence into founder timeline records', () => {
  const events = buildShowTelaContinuityEvents({
    showTelaId: 'show-1',
    showTelaName: 'Crusade 2027',
    runtimeEvents: [
      {
        id: 'created-1',
        workspaceId: 'showtela-crusade-1',
        replaySequence: 1,
        type: 'showtela.lifecycle.created',
        eventVersion: 1,
        schemaVersion: 'runtime.v1',
        source: 'system',
        governanceState: 'approved',
        executionState: 'completed',
        createdAt: '2026-05-31T19:00:00.000Z',
        payload: { showTelaName: 'Crusade 2027' },
      },
      {
        id: 'upload-1',
        workspaceId: 'showtela-crusade-1',
        replaySequence: 2,
        type: SHOWTELA_RUNTIME_EVENT_TYPES.artifactUploaded,
        eventVersion: 1,
        schemaVersion: 'runtime.v1',
        source: 'operator',
        governanceState: 'approved',
        executionState: 'completed',
        createdAt: '2026-05-31T19:04:00.000Z',
        payload: { insertedId: 'artifact-1', submittedBy: 'Jon Hartman' },
      },
      {
        id: 'hydrate-1',
        workspaceId: 'showtela-crusade-1',
        replaySequence: 3,
        type: SHOWTELA_RUNTIME_EVENT_TYPES.peopleHydrated,
        eventVersion: 1,
        schemaVersion: 'runtime.v1',
        source: 'operator',
        governanceState: 'approved',
        executionState: 'completed',
        createdAt: '2026-05-31T19:05:00.000Z',
        payload: { insertedId: 'artifact-1', submittedBy: 'Jon Hartman' },
      },
    ],
    artifacts: [{
      id: 'artifact-1',
      title: 'Anchor Directory Uploaded',
      threadId: 'showtela-runtime',
      sessionId: 'runtime',
      text: [
        '## SHOWTELA OPERATIONS',
        '| Role | Name |',
        '|---|---|',
        '| Runtime Lead | Jon Hartman |',
      ].join('\n'),
      createdAt: '2026-05-31T19:04:00.000Z',
    }],
  })

  assert.equal(events.length, 3)
  assert.equal(events[0]?.event_type, 'PEOPLE_HYDRATED')
  assert.equal(events[1]?.event_type, 'ANCHOR_UPLOADED')
  assert.equal(events[2]?.event_type, 'SHOWTELA_CREATED')
})
