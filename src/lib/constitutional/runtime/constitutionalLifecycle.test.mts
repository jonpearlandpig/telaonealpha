import test from 'node:test'
import assert from 'node:assert/strict'

import { buildConstitutionalLifecycle } from './constitutionalLifecycle'
import type { ConstitutionalMiddlewareResult } from './constitutionalTypes'

function result(overrides: Partial<ConstitutionalMiddlewareResult> = {}): ConstitutionalMiddlewareResult {
  return {
    legitimacy: 'confirmed',
    rightsValidation: undefined,
    governanceState: 'approved',
    constitutionalPath: ['telauthorium', 'pen-and-sword', 'the-ledger'],
    auditTrace: {
      auditId: 'audit:test',
      workspaceId: 'tela-showtela',
      loggedAt: '2026-05-27T00:00:00.000Z',
      constitutionalPath: ['telauthorium', 'pen-and-sword', 'the-ledger'],
      trigger: 'test',
    },
    escalationRequired: false,
    blockingReason: undefined,
    legalityConfirmed: true,
    legalityState: 'confirmed',
    escalationState: 'none',
    authorshipTrace: { author: 'Jon Hartman', surface: 'runtime', capturedAt: '2026-05-27T00:00:00.000Z' },
    lineageRef: { lineageId: 'lineage-1', chain: ['lineage-1'], capturedAt: '2026-05-27T00:00:00.000Z' },
    constitutionalSystems: [
      { id: 'telauthorium', executed: true, reason: 'test' },
      { id: 'pen-and-sword', executed: true, reason: 'test' },
      { id: 'the-ledger', executed: true, reason: 'test' },
    ],
    ...overrides,
  }
}

test('constitutional lifecycle preserves deterministic success ordering', () => {
  assert.deepEqual(
    buildConstitutionalLifecycle(result()).map((item) => item.type),
    [
      'constitutional.invoked',
      'constitutional.validated',
      'constitutional.legitimacy.confirmed',
      'constitutional.audit.logged',
    ],
  )
})

test('constitutional lifecycle preserves blocked and escalated ordering', () => {
  assert.deepEqual(
    buildConstitutionalLifecycle(result({
      legitimacy: 'blocked',
      governanceState: 'blocked',
      legalityConfirmed: false,
      legalityState: 'failed',
      escalationRequired: true,
      escalationState: 'required',
      blockingReason: 'Rights inheritance is required before execution.',
    })).map((item) => item.type),
    [
      'constitutional.invoked',
      'constitutional.blocked',
      'constitutional.audit.logged',
      'constitutional.escalated',
    ],
  )
})
