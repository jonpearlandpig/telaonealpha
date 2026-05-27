import test from 'node:test'
import assert from 'node:assert/strict'

import { invokeConstitutionalMiddleware } from './constitutionalInvocation'
import { createRuntimeEvent } from '@/lib/runtime/runtimeTypes'

test('constitutional invocation emits replay-safe lifecycle events in deterministic order', async () => {
  const emitted: Array<{ type: string; payloadType?: string }> = []

  const result = await invokeConstitutionalMiddleware({
    workspaceId: 'tela-showtela',
    action: 'ingest.continuity',
    authority: 'S2',
    governanceState: 'approved',
    executionState: 'completed',
    authorship: { author: 'Jon Hartman', surface: 'runtime' },
    timestamp: '2026-05-27T00:00:00.000Z',
  }, async (input) => {
    emitted.push({ type: input.type, payloadType: input.payloadType })
    return createRuntimeEvent({ id: `${input.type}:1`, ...input })
  })

  assert.deepEqual(emitted.map((event) => event.type), [
    'constitutional.invoked',
    'constitutional.validated',
    'constitutional.legitimacy.confirmed',
    'constitutional.audit.logged',
  ])
  assert.equal(result.emittedEventIds.length, 4)
  assert.equal(result.auditTrace.auditId, 'audit:tela-showtela:ingest.continuity')
})

test('constitutional invocation preserves escalation when legitimacy fails', async () => {
  const emitted: string[] = []

  const result = await invokeConstitutionalMiddleware({
    workspaceId: 'tela-showtela',
    action: 'generate.report',
    authority: 'S1',
    governanceState: 'approved',
    executionState: 'queued',
    authorship: { required: true, author: 'Jon Hartman', surface: 'runtime' },
    classification: { sacredIp: true },
    timestamp: '2026-05-27T00:00:00.000Z',
  }, async (input) => {
    emitted.push(input.type)
    return createRuntimeEvent({ id: `${input.type}:1`, ...input })
  })

  assert.deepEqual(emitted, [
    'constitutional.invoked',
    'constitutional.blocked',
    'constitutional.audit.logged',
    'constitutional.escalated',
  ])
  assert.equal(result.escalationRequired, true)
})
