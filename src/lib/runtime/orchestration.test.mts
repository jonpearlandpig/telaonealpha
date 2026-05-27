import test from 'node:test'
import assert from 'node:assert/strict'

import { ACTIONS } from './actions'
import { buildOrchestrationEnvelope } from './orchestration'

test('buildOrchestrationEnvelope protects authorship-sensitive actions before execution', () => {
  const envelope = buildOrchestrationEnvelope({
    workspaceId: 'tela-showtela',
    action: ACTIONS.GENERATE_REPORT,
    authority: 'S1',
    governanceState: 'approved',
    executionState: 'queued',
    classification: {
      authorshipSensitive: true,
      creativeOutput: true,
    },
    authorship: {
      required: true,
      author: 'Jon Hartman',
      rightsInheritance: ['pearl-and-pig', 'telauthorium'],
      surface: 'runtime',
      parentLineageId: 'lineage-root',
    },
  })

  assert.equal(envelope.protectedAction, true)
  assert.equal(envelope.authorshipTrace?.author, 'Jon Hartman')
  assert.equal(envelope.lineageRef?.parentId, 'lineage-root')
  assert.equal(envelope.rightsValidation?.allowed, true)
  assert.equal(envelope.legality.allowed, true)
  assert.equal(envelope.routingPlan.governanceState, 'approved')
  assert.equal(envelope.constitutionalSystems.length, 3)
  assert.equal(envelope.constitutionalSystems.every((system) => system.role === 'constitutional-middleware' && system.invoked), true)
  assert.equal(envelope.routingPlan.explanation.triggeringSignals.length >= 4, true)
  assert.equal(envelope.invocationOutput.recommendations.length, envelope.routingPlan.sequence.length)
  assert.equal(envelope.invocationOutput.governanceState.constitutionalSystems.length, 3)
})

test('buildOrchestrationEnvelope fails protected execution without rights inheritance', () => {
  const envelope = buildOrchestrationEnvelope({
    workspaceId: 'tela-showtela',
    action: ACTIONS.GENERATE_REPORT,
    authority: 'S1',
    governanceState: 'approved',
    executionState: 'queued',
    classification: {
      sacredIp: true,
    },
    authorship: {
      required: true,
      author: 'Jon Hartman',
      surface: 'runtime',
    },
  })

  assert.equal(envelope.protectedAction, true)
  assert.equal(envelope.rightsValidation?.allowed, false)
  assert.match(envelope.rightsValidation?.denialReason ?? '', /Rights inheritance/)
  assert.equal(envelope.invocationOutput.escalationRequired, true)
  assert.equal(envelope.invocationOutput.blockers.length, 1)
})
