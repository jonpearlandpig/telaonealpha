import test from 'node:test'
import assert from 'node:assert/strict'

import { executeConstitutionalMiddleware } from './constitutionalMiddleware'

test('constitutional middleware confirms legitimacy deterministically for non-protected runtime work', () => {
  const result = executeConstitutionalMiddleware({
    workspaceId: 'tela-showtela',
    action: 'ingest.continuity',
    authority: 'S2',
    governanceState: 'approved',
    executionState: 'completed',
    authorship: { author: 'Jon Hartman', surface: 'runtime' },
    timestamp: '2026-05-27T00:00:00.000Z',
  })

  assert.equal(result.legitimacy, 'confirmed')
  assert.equal(result.legalityConfirmed, true)
  assert.equal(result.constitutionalSystems.every((system) => system.executed), true)
  assert.deepEqual(result.constitutionalSystems.map((system) => system.id), ['telauthorium', 'pen-and-sword', 'the-ledger'])
})

test('constitutional middleware blocks protected execution without rights inheritance', () => {
  const result = executeConstitutionalMiddleware({
    workspaceId: 'tela-showtela',
    action: 'generate.report',
    authority: 'S1',
    governanceState: 'approved',
    executionState: 'queued',
    authorship: { required: true, author: 'Jon Hartman', surface: 'runtime' },
    classification: { sacredIp: true },
    timestamp: '2026-05-27T00:00:00.000Z',
  })

  assert.equal(result.legitimacy, 'blocked')
  assert.equal(result.legalityConfirmed, false)
  assert.match(result.blockingReason ?? '', /Rights inheritance/)
  assert.equal(result.escalationRequired, true)
})
