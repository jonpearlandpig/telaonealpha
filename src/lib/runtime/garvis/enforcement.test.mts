import test from 'node:test'
import assert from 'node:assert/strict'

import { ACTIONS } from '../actions'
import type { RuntimeEvent } from '../runtimeTypes'
import { enforceNILProtection, enforceTwoKeyProtocol, reconstructActiveEscalations } from './enforcement'

function event(input: Partial<RuntimeEvent> & Pick<RuntimeEvent, 'id' | 'type' | 'createdAt'>): RuntimeEvent {
  return {
    eventVersion: 1,
    schemaVersion: 'runtime.v1',
    source: 'operator',
    governanceState: 'approved',
    executionState: 'queued',
    ...input,
  }
}

test('NIL protection blocks transfer actions and preserves escalation lineage', () => {
  const result = enforceNILProtection({
    workspaceId: 'tela-showtela',
    action: ACTIONS.TRANSFER_NIL,
    governanceState: 'approved',
    executionState: 'queued',
    authority: 'S0',
  })

  assert.equal(result.blocked, true)
  assert.equal(result.escalateTo, 'S0')
  assert.match(result.blockers[0] ?? '', /Juan Otero/)
})

test('Two-Key protocol blocks commitments without Nathan Jon and S1/S2 alignment', () => {
  const result = enforceTwoKeyProtocol({
    workspaceId: 'tela-showtela',
    action: ACTIONS.FINANCIAL_COMMITMENT,
    governanceState: 'approved',
    executionState: 'queued',
    authority: 'S1',
    twoKey: {
      required: true,
      approvedBy: ['Legal Review'],
    },
  })

  assert.equal(result.satisfied, false)
  assert.equal(result.blockers.some((blocker) => blocker.includes('Nathan Jon')), true)
  assert.equal(result.blockers.some((blocker) => blocker.includes('S1/S2')), true)
})

test('active escalations reconstruct from append-only propagation and resolution events', () => {
  const escalations = reconstructActiveEscalations([
    event({
      id: 'evt-1',
      workspaceId: 'tela-showtela',
      replaySequence: 1,
      type: 'governance.escalation.propagated',
      governanceState: 'escalated',
      executionState: 'failed',
      createdAt: '2026-05-25T00:00:00.000Z',
      payload: {
        escalationId: 'esc-1',
        action: ACTIONS.TRANSFER_NIL,
        blockers: ['Juan Otero remains the sole NIL holder.'],
        escalateTo: 'S0',
        showId: 'showtela',
      },
    }),
    event({
      id: 'evt-2',
      workspaceId: 'tela-showtela',
      replaySequence: 2,
      type: 'governance.escalation.resolved',
      governanceState: 'approved',
      executionState: 'completed',
      createdAt: '2026-05-25T02:00:00.000Z',
      payload: {
        escalationId: 'esc-1',
      },
    }),
    event({
      id: 'evt-3',
      workspaceId: 'tela-showtela',
      replaySequence: 3,
      type: 'governance.escalation.propagated',
      governanceState: 'escalated',
      executionState: 'failed',
      createdAt: '2026-05-26T00:00:00.000Z',
      payload: {
        escalationId: 'esc-2',
        action: ACTIONS.FINANCIAL_COMMITMENT,
        blockers: ['Two-Key protocol requires at least 2 aligned approvals.'],
        escalateTo: 'S3',
        showId: 'showtela',
      },
    }),
  ])

  assert.equal(escalations.length, 1)
  assert.equal(escalations[0]?.id, 'esc-2')
  assert.equal(escalations[0]?.resolved, false)
})
