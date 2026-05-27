import test from 'node:test'
import assert from 'node:assert/strict'

import type { RuntimeEvent } from '@/lib/runtime/runtimeTypes'
import { findStaleUnresolvedStates } from './statePersistence'

function event(input: Partial<RuntimeEvent> & Pick<RuntimeEvent, 'id' | 'type' | 'createdAt'>): RuntimeEvent {
  return {
    eventVersion: 1,
    schemaVersion: 'runtime.v1',
    source: 'operator',
    governanceState: 'pending',
    executionState: 'queued',
    ...input,
  }
}

test('stale unresolved pressure is detected after 72 hours without silent reset', () => {
  const staleStates = findStaleUnresolvedStates({
    workspaceId: 'tela-showtela',
    now: new Date('2026-05-27T12:00:00.000Z'),
    replayEvents: [
      event({
        id: 'evt-1',
        workspaceId: 'tela-showtela',
        replaySequence: 1,
        type: 'continuity.ingested',
        createdAt: '2026-05-23T08:00:00.000Z',
        payloadType: 'continuity.ingested',
        payload: {
          unresolvedId: 'unresolved-1',
          headline: 'Awaiting promoter response',
          threadId: 'thread-1',
        },
      }),
    ],
  })

  assert.equal(staleStates.length, 1)
  assert.equal(staleStates[0]?.entityId, 'unresolved-1')
  assert.equal((staleStates[0]?.ageHours ?? 0) >= 72, true)
})
