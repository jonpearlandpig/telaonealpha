import test from 'node:test'
import assert from 'node:assert/strict'

import type { RuntimeEvent } from '../runtimeTypes'
import { buildContinuityReplay, renderContinuityReplayAnswer } from './replay'

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

test('operational replay answers what happened since yesterday from runtime lineage only', () => {
  const replay = buildContinuityReplay({
    workspaceId: 'tela-showtela',
    query: 'What happened since yesterday?',
    now: new Date('2026-05-27T12:00:00.000Z'),
    events: [
      event({
        id: 'evt-1',
        workspaceId: 'tela-showtela',
        replaySequence: 1,
        type: 'operator.analysis.completed',
        createdAt: '2026-05-25T12:00:00.000Z',
        payload: { action: 'generate.report' },
      }),
      event({
        id: 'evt-2',
        workspaceId: 'tela-showtela',
        replaySequence: 2,
        type: 'governance.escalation.propagated',
        governanceState: 'escalated',
        executionState: 'failed',
        createdAt: '2026-05-27T08:00:00.000Z',
        payload: {
          escalationId: 'esc-2',
          action: 'financial.commitment',
          blockers: ['Two-Key approval missing'],
          escalateTo: 'S3',
          showId: 'showtela',
        },
      }),
      event({
        id: 'evt-3',
        workspaceId: 'tela-showtela',
        replaySequence: 3,
        type: 'runtime.rollback.signaled',
        governanceState: 'escalated',
        executionState: 'rolled-back',
        createdAt: '2026-05-27T09:00:00.000Z',
        payload: {
          rollbackId: 'rb-1',
          action: 'financial.commitment',
          classification: 'CRITICAL',
          reason: 'alignment collapsed',
        },
      }),
    ],
  })

  assert.equal(replay.frames.length, 2)
  assert.equal(replay.unresolvedEscalations.length, 1)
  assert.match(renderContinuityReplayAnswer(replay), /financial\.commitment escalated/)
  assert.doesNotMatch(renderContinuityReplayAnswer(replay), /summary|story|assistant/i)
})
