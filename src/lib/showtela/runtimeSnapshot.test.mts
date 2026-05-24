import test from 'node:test'
import assert from 'node:assert/strict'
import { createRuntimeSnapshotMeta, replaceHomeWithDirectoryIngest, resolveRefreshHomeData } from './runtimeSnapshot'
import type { ContinuityEvent, ShowTelaHomeData } from './types'

function crusadeBase(): ShowTelaHomeData {
  return {
    activeOps: [{ id: 'person-crusade', name: 'Crusade Lead', role: 'Production' }],
    fluencyPartners: [{ id: 'partner-crusade', name: 'Crusade Partner', role: 'Partner' }],
    operations: [{ id: 'op-crusade', title: 'Crusade', status: 'active', latestMovement: 'Old state' }],
    unresolved: [{ id: 'unresolved-crusade', title: 'Crusade blocker', severity: 'high', operation: 'Crusade' }],
    continuityFeed: [{
      id: 'crusade-event',
      headline: 'Crusade snapshot anchored',
      body: 'Old Crusade runtime state',
      timestamp: '2026-05-24T10:00:00.000Z',
      threadId: 'thread-crusade',
    }],
    pressureSummary: { total: 1, high: 1, medium: 0 },
    runtimeTimeline: [],
    source: 'supabase',
    diagnosticState: 'persistence-connected',
  }
}

function positiveRocksEvent(): ContinuityEvent {
  return {
    id: 'positive-rocks-event',
    headline: 'Positive Rocks directory ingested',
    body: 'Fresh Positive Rocks runtime state',
    timestamp: '2026-05-24T12:00:00.000Z',
    threadId: 'thread-positive-rocks',
  }
}

test('directory ingest replaces old runtime snapshot instead of merging Crusade state forward', () => {
  const meta = createRuntimeSnapshotMeta({
    snapshotId: 'snap_positive_rocks',
    workspaceId: 'tela-showtela',
    updatedAt: '2026-05-24T12:00:00.000Z',
    overwriteMode: 'replace',
    sourceIngest: 'directory',
  })

  const replaced = replaceHomeWithDirectoryIngest({
    base: crusadeBase(),
    event: positiveRocksEvent(),
    people: [{ id: 'person-positive-rocks', name: 'Positive Rocks Lead', role: 'FOH', active: true }],
    operations: [{ id: 'op-positive-rocks', title: 'Positive Rocks', status: 'active', latestMovement: 'Fresh ingest' }],
    meta,
  })

  assert.deepEqual(replaced.activeOps.map((person) => person.name), ['Positive Rocks Lead'])
  assert.deepEqual(replaced.operations.map((operation) => operation.title), ['Positive Rocks'])
  assert.deepEqual(replaced.continuityFeed.map((event) => event.headline), ['Positive Rocks directory ingested'])
  assert.equal(replaced.unresolved.length, 0)
  assert.equal(replaced.fluencyPartners.length, 0)
  assert.equal(replaced.runtimeSnapshotMeta?.snapshotId, 'snap_positive_rocks')
})

test('refresh keeps the latest canonical runtime snapshot instead of rehydrating older Crusade data', () => {
  const freshNotion = crusadeBase()
  const canonicalCached = replaceHomeWithDirectoryIngest({
    base: crusadeBase(),
    event: positiveRocksEvent(),
    people: [{ id: 'person-positive-rocks', name: 'Positive Rocks Lead', role: 'FOH', active: true }],
    operations: [{ id: 'op-positive-rocks', title: 'Positive Rocks', status: 'active', latestMovement: 'Fresh ingest' }],
    meta: createRuntimeSnapshotMeta({
      snapshotId: 'snap_positive_rocks',
      workspaceId: 'tela-showtela',
      updatedAt: '2026-05-24T12:00:00.000Z',
      overwriteMode: 'replace',
      sourceIngest: 'directory',
    }),
  })

  const resolved = resolveRefreshHomeData(freshNotion, canonicalCached)

  assert.deepEqual(resolved.activeOps.map((person) => person.name), ['Positive Rocks Lead'])
  assert.deepEqual(resolved.operations.map((operation) => operation.title), ['Positive Rocks'])
  assert.deepEqual(resolved.continuityFeed.map((event) => event.headline), ['Positive Rocks directory ingested'])
  assert.equal(resolved.operations.some((operation) => operation.title === 'Crusade'), false)
  assert.equal(resolved.continuityFeed.some((event) => event.headline.includes('Crusade')), false)
})
