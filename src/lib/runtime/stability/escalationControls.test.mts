import test from 'node:test'
import assert from 'node:assert/strict'

import type { RuntimeEvent } from '../runtimeTypes'
import { deriveEscalationControls } from './escalationControls'

function event(input: Partial<RuntimeEvent> & Pick<RuntimeEvent, 'id' | 'type' | 'createdAt' | 'replaySequence'>): RuntimeEvent {
  return {
    workspaceId: 'tela-showtela',
    eventVersion: 1,
    schemaVersion: 'runtime.v1',
    source: 'operator',
    governanceState: 'escalated',
    executionState: 'failed',
    payload: {},
    ...input,
  }
}

test('escalation containment remains deterministic for operator escalations', () => {
  const controls = deriveEscalationControls([
    event({ id: 'evt-1', replaySequence: 1, type: 'operator.escalated', createdAt: '2026-05-27T00:00:00.000Z' }),
  ], '2026-05-27T00:01:00.000Z')

  assert.equal(controls[0]?.active, true)
  assert.equal(controls[0]?.constitutionalExempt, false)
})

test('constitutional escalation remains exempt when legality requires it', () => {
  const controls = deriveEscalationControls([
    event({ id: 'evt-1', replaySequence: 1, type: 'constitutional.escalated', createdAt: '2026-05-27T00:00:00.000Z', source: 'system' }),
  ])

  assert.equal(controls[0]?.constitutionalExempt, true)
  assert.equal(controls[0]?.active, false)
})
