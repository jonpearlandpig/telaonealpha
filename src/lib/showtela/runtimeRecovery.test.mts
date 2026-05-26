import test from 'node:test'
import assert from 'node:assert/strict'
import { recoverCanonicalShowTelaHomeFromArtifactRows } from './runtimeRecovery'
import type { ShowTelaHomeData } from './types'

test('recoverCanonicalShowTelaHomeFromArtifactRows rebuilds canonical state from latest directory artifact', () => {
  const recovered = recoverCanonicalShowTelaHomeFromArtifactRows({
    artifacts: [{
      id: 'artifact-positive-rocks',
      title: 'Positive Rocks directory ingested',
      threadId: 'showtela-runtime-continuity',
      sessionId: 'showtela-runtime-ingest',
      artifactGroupId: 'showtela-runtime-continuity',
      createdAt: '2026-05-24T12:00:00.000Z',
      text: '# Positive Rocks\n## Front of House\nPositive Rocks Lead - FOH\n## Merch\nMerch Manager - Merch',
      structure: JSON.stringify({
        continuityEvent: {
          id: 'positive-rocks-event',
          headline: 'Positive Rocks directory ingested',
          timestamp: '2026-05-24T12:00:00.000Z',
          threadId: 'thread-positive-rocks',
        },
      }),
    }],
    cached: null,
    cachedUpdatedAt: null,
  })

  assert.ok(recovered)
  assert.deepEqual(recovered?.activeOps.map((person) => person.name), ['Positive Rocks Lead', 'Merch Manager'])
  assert.deepEqual(recovered?.operations.map((operation) => operation.title), ['Front of House', 'Merch'])
  assert.equal(recovered?.runtimeSnapshotMeta?.overwriteMode, 'replace')
  assert.equal(recovered?.continuityFeed[0]?.headline, 'Positive Rocks directory ingested')
})

test('recoverCanonicalShowTelaHomeFromArtifactRows ignores newer stale cache timestamps when a canonical artifact exists', () => {
  const staleCached: ShowTelaHomeData = {
    activeOps: [{ id: 'person-crusade', name: 'Crusade Lead', role: 'Production' }],
    fluencyPartners: [],
    operations: [{ id: 'op-crusade', title: 'Crusade', status: 'active', latestMovement: 'Stale cache rewrite' }],
    unresolved: [{ id: 'unresolved-crusade', title: 'Crusade blocker', severity: 'high', operation: 'Crusade' }],
    continuityFeed: [{
      id: 'crusade-event',
      headline: 'Crusade snapshot anchored',
      body: 'Old Crusade runtime state',
      timestamp: '2026-05-24T13:00:00.000Z',
      threadId: 'thread-crusade',
    }],
    pressureSummary: { total: 1, high: 1, medium: 0 },
    runtimeTimeline: [],
    source: 'supabase',
    diagnosticState: 'persistence-connected',
  }

  const recovered = recoverCanonicalShowTelaHomeFromArtifactRows({
    artifacts: [{
      id: 'artifact-positive-rocks',
      title: 'Positive Rocks directory ingested',
      threadId: 'showtela-runtime-continuity',
      sessionId: 'showtela-runtime-ingest',
      artifactGroupId: 'showtela-runtime-continuity',
      createdAt: '2026-05-24T12:00:00.000Z',
      text: '# Positive Rocks\n## Front of House\nPositive Rocks Lead - FOH',
      structure: JSON.stringify({
        continuityEvent: {
          id: 'positive-rocks-event',
          headline: 'Positive Rocks directory ingested',
          timestamp: '2026-05-24T12:00:00.000Z',
          threadId: 'thread-positive-rocks',
        },
      }),
    }],
    cached: staleCached,
    cachedUpdatedAt: '2026-05-24T13:00:00.000Z',
  })

  assert.ok(recovered)
  assert.deepEqual(recovered?.activeOps.map((person) => person.name), ['Positive Rocks Lead'])
  assert.deepEqual(recovered?.operations.map((operation) => operation.title), ['Front of House'])
  assert.equal(recovered?.continuityFeed[0]?.headline, 'Positive Rocks directory ingested')
})
