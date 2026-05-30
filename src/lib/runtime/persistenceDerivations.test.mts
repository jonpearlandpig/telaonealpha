import test from 'node:test'
import assert from 'node:assert/strict'

import { buildPersistenceMutationsForEvent } from './persistenceDerivations'
import type { RuntimeEvent } from './runtimeTypes'

const routingEvent: RuntimeEvent = {
  id: 'evt-routing',
  workspaceId: 'tela-showtela',
  replaySequence: 7,
  type: 'operator.analysis.completed',
  eventVersion: 1,
  schemaVersion: 'runtime.v1',
  source: 'operator',
  governanceState: 'approved',
  executionState: 'completed',
  traceId: 'trace-1',
  correlationId: 'corr-1',
  lineageId: 'lineage-child',
  payloadType: 'operator.analysis',
  createdAt: '2026-05-26T15:29:00.000Z',
  payload: {
    action: 'generate.report',
    routingPlanId: 'plan-1',
    selectedOperators: ['mose-router', 'garvis-enforcement'],
    sequence: [{ order: 1, operatorId: 'mose-router', action: 'generate.report' }],
    rollbackClass: 'none',
    escalationPath: ['mose-router', 'flightpath-engine', 'garvis-enforcement'],
    governanceState: 'approved',
    legal: true,
    source: 'pen-and-sword',
    parentLineageId: 'lineage-root',
    rightsValidation: { allowed: true },
  },
}

test('buildPersistenceMutationsForEvent persists canonical operator analysis for replay-safe routing and legality', () => {
  const writes = buildPersistenceMutationsForEvent(routingEvent)

  assert.equal(writes.routingPlans.length, 1)
  assert.equal(writes.routingPlans[0]?.id, 'plan-1')
  assert.deepEqual(writes.routingPlans[0]?.selectedOperators, ['mose-router', 'garvis-enforcement'])
  assert.deepEqual(writes.routingPlans[0]?.escalationPath, ['mose-router', 'flightpath-engine', 'garvis-enforcement'])

  assert.equal(writes.lineageGraph.length, 1)
  assert.equal(writes.lineageGraph[0]?.lineageId, 'lineage-child')
  assert.equal(writes.lineageGraph[0]?.parentLineageId, 'lineage-root')

  assert.equal(writes.enforcementActions.length, 1)
  assert.equal(writes.enforcementActions[0]?.decision, 'operator.analysis.completed')
  assert.equal(writes.operationalObjects.some((item) => item.objectType === 'routing-plan'), true)
  assert.equal(writes.operationalObjects.some((item) => item.objectType === 'authorship-guard'), true)
  assert.equal(writes.operationalObjects.some((item) => item.objectType === 'legality-check'), true)
})
