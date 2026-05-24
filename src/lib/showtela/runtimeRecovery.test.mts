import test from 'node:test'
import assert from 'node:assert/strict'
import { recoverCanonicalShowTelaHomeFromArtifactRows } from './runtimeRecovery'

test('recoverCanonicalShowTelaHomeFromArtifactRows rebuilds canonical state from latest directory artifact', () => {
  const recovered = recoverCanonicalShowTelaHomeFromArtifactRows({
    artifacts: [{
      id: 'artifact-positive-rocks',
      workspaceId: 'tela-showtela',
      threadId: 'showtela-runtime-continuity',
      payload: JSON.stringify({
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
      }),
      createdAt: '2026-05-24T12:00:00.000Z',
      updatedAt: '2026-05-24T12:00:00.000Z',
      provenance: {
        sourceType: 'runtime',
        sourceId: 'artifact-positive-rocks',
        truthRank: 1,
        lineageRefs: ['artifact-positive-rocks'],
        createdAt: '2026-05-24T12:00:00.000Z',
        updatedAt: '2026-05-24T12:00:00.000Z',
      },
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
