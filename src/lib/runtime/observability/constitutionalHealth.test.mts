import test from 'node:test'
import assert from 'node:assert/strict'

import type { RuntimeEvent } from '../runtimeTypes'
import { buildConstitutionalHealth } from './constitutionalHealth'

function event(input: Partial<RuntimeEvent> & Pick<RuntimeEvent, 'id' | 'type' | 'createdAt' | 'replaySequence'>): RuntimeEvent {
  return {
    workspaceId: 'tela-showtela',
    eventVersion: 1,
    schemaVersion: 'runtime.v1',
    source: 'system',
    governanceState: 'approved',
    executionState: 'completed',
    payload: {},
    ...input,
  }
}

test('constitutional health reports legitimacy and ordering integrity', () => {
  const output = buildConstitutionalHealth([
    event({ id: 'evt-1', replaySequence: 1, type: 'constitutional.invoked', createdAt: '2026-05-27T00:00:00.000Z', payload: { auditTrace: { auditId: 'audit-1' } } }),
    event({ id: 'evt-2', replaySequence: 2, type: 'constitutional.legitimacy.confirmed', createdAt: '2026-05-27T00:00:01.000Z' }),
    { ...event({ id: 'evt-3', replaySequence: 3, type: 'operator.invoked', createdAt: '2026-05-27T00:00:02.000Z', source: 'operator' }), source: 'operator' as const },
  ])

  assert.equal(output.legitimacyConfirmations, 1)
  assert.equal(output.constitutionalOrderingIntegrity, true)
})
