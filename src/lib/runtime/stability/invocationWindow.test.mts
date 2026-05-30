import test from 'node:test'
import assert from 'node:assert/strict'

import type { RuntimeEvent } from '../runtimeTypes'
import { buildInvocationSpacing, suppressDuplicateInvocations } from './invocationWindow'

function event(input: Partial<RuntimeEvent> & Pick<RuntimeEvent, 'id' | 'type' | 'createdAt' | 'replaySequence'>): RuntimeEvent {
  return {
    workspaceId: 'tela-showtela',
    eventVersion: 1,
    schemaVersion: 'runtime.v1',
    source: 'operator',
    governanceState: 'approved',
    executionState: 'completed',
    payload: { action: 'generate.report', operatorId: 'garvis-enforcement' },
    ...input,
  }
}

test('duplicate invocation suppression is deterministic', () => {
  const suppressed = suppressDuplicateInvocations([
    event({ id: 'evt-1', replaySequence: 1, type: 'operator.invoked', createdAt: '2026-05-27T00:00:00.000Z' }),
    event({ id: 'evt-2', replaySequence: 2, type: 'operator.invoked', createdAt: '2026-05-27T00:00:10.000Z' }),
  ])

  assert.equal(suppressed.length, 1)
})

test('invocation pacing preserves deterministic spacing lineage', () => {
  const spacing = buildInvocationSpacing([
    event({ id: 'evt-1', replaySequence: 1, type: 'operator.invoked', createdAt: '2026-05-27T00:00:00.000Z' }),
    event({ id: 'evt-2', replaySequence: 2, type: 'operator.invoked', createdAt: '2026-05-27T00:01:10.000Z' }),
  ])

  assert.equal(spacing.length, 2)
  assert.equal(spacing[1]?.previousInvocationId, spacing[0]?.invocationId)
})
