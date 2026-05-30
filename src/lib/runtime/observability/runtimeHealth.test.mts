import test from 'node:test'
import assert from 'node:assert/strict'

import type { RuntimeEvent } from '../runtimeTypes'
import { buildRuntimeHealth } from './runtimeHealth'

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

test('runtime health aggregates deterministic replay authority telemetry', () => {
  const output = buildRuntimeHealth({
    workspaceId: 'tela-showtela',
    events: [
      event({ id: 'evt-1', replaySequence: 1, type: 'create.unresolved', createdAt: '2026-05-27T00:00:00.000Z', lineageId: 'lineage-1' }),
    ],
  })

  assert.equal(output.runtimeAuthoritySource, 'replay-reconstruction')
  assert.equal(typeof output.replayChecksum, 'string')
  assert.equal(typeof output.deterministicRestoration, 'boolean')
})
