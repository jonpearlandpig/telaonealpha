import test from 'node:test'
import assert from 'node:assert/strict'

import {
  mapSeverityToImpact,
  computePressureFromState,
  computeTimeSensitivity,
  computeDependencyWeight,
  resolveOwner,
  resolveRecommendedAction,
  buildFocusEngine,
} from './focusBuilder'
import { buildFocusDiagnostics } from './diagnostics'
import type { OperationalStateRecord, OperationalProjection } from '@/lib/runtime/state/model'
import type { FocusItem } from './types'

// ─── Fixtures ───────────────────────────────────────────────────────────────

function makeState(overrides: Partial<OperationalStateRecord> = {}): OperationalStateRecord {
  return {
    stateId: 'state:test:001',
    entityId: 'entity:test',
    entityType: 'continuity-thread',
    entityName: 'Test Entity',
    stateCode: 'UNRESOLVED_DEPENDENCY',
    stateLabel: '⛔ Test Entity',
    stateEmoji: '⛔',
    severity: 'high',
    lifecycle: 'entered',
    triggerDetail: '2 blockers, depth 1, governance 0',
    resolutionOwner: 'Marcus Stone',
    dependencyIds: ['dep:1'],
    dependencyChain: ['entity:test', 'dep:1'],
    reasoningChain: ['object:continuity-thread', 'status:blocked', 'pressure:6'],
    derivationSource: 'dependency-graph',
    sourceEventIds: ['event:abc'],
    derivedAt: '2026-05-30T00:00:00.000Z',
    derivationVersion: 'operational-state.v1',
    ...overrides,
  }
}

function makeProjection(overrides: Partial<OperationalProjection> = {}): OperationalProjection {
  return {
    workspaceId: 'tela-showtela',
    showId: 'crusade',
    projectionVersion: 'operational-projection.v1',
    generatedAt: '2026-05-30T00:00:00.000Z',
    derivedAt: '2026-05-30T00:00:00.000Z',
    derivationVersion: 'operational-state.v1',
    derivedFromEventCount: 5,
    states: [],
    blockers: [],
    movement: [],
    readiness: [],
    escalations: [],
    dependencyChains: [],
    groupedTopology: { critical: 0, high: 0, medium: 0, low: 0, blockers: 0, movement: 0, readiness: 0, escalations: 0 },
    summary: {
      currentTruth: '',
      mattersNow: '',
      nextMovement: '',
      blockersLabel: '',
      movementLabel: '',
      readinessLabel: '',
    },
    ...overrides,
  }
}

// ─── Impact Scoring ──────────────────────────────────────────────────────────

test('impact: critical severity maps to 100', () => {
  assert.equal(mapSeverityToImpact('critical'), 100)
})

test('impact: high severity maps to 75', () => {
  assert.equal(mapSeverityToImpact('high'), 75)
})

test('impact: medium severity maps to 50', () => {
  assert.equal(mapSeverityToImpact('medium'), 50)
})

test('impact: low severity maps to 25', () => {
  assert.equal(mapSeverityToImpact('low'), 25)
})

test('impact: unknown severity maps to 0', () => {
  assert.equal(mapSeverityToImpact('unknown'), 0)
})

// ─── Pressure Scoring ────────────────────────────────────────────────────────

test('pressure: critical severity baseline is 30', () => {
  const state = makeState({ severity: 'critical', lifecycle: 'entered', stateCode: 'STALE_PRESSURE' })
  assert.equal(computePressureFromState(state), 30)
})

test('pressure: high severity baseline is 20', () => {
  const state = makeState({ severity: 'high', lifecycle: 'entered', stateCode: 'STALE_PRESSURE' })
  assert.equal(computePressureFromState(state), 20)
})

test('pressure: escalated lifecycle adds 10', () => {
  const state = makeState({ severity: 'medium', lifecycle: 'escalated', stateCode: 'STALE_PRESSURE' })
  assert.equal(computePressureFromState(state), 20) // 10 + 10
})

test('pressure: GOVERNANCE_BLOCKED stateCode adds 10', () => {
  const state = makeState({ severity: 'medium', lifecycle: 'entered', stateCode: 'GOVERNANCE_BLOCKED' })
  assert.equal(computePressureFromState(state), 20) // 10 + 10
})

test('pressure: UNRESOLVED_DEPENDENCY stateCode adds 10', () => {
  const state = makeState({ severity: 'medium', lifecycle: 'entered', stateCode: 'UNRESOLVED_DEPENDENCY' })
  assert.equal(computePressureFromState(state), 20) // 10 + 10
})

test('pressure: critical + escalated + GOVERNANCE_BLOCKED is capped at 50', () => {
  const state = makeState({ severity: 'critical', lifecycle: 'escalated', stateCode: 'GOVERNANCE_BLOCKED' })
  assert.equal(computePressureFromState(state), 50) // 30 + 10 + 10 = 50
})

// ─── Time Sensitivity ────────────────────────────────────────────────────────

test('timeSensitivity: null show date returns 0', () => {
  assert.equal(computeTimeSensitivity(null), 0)
})

test('timeSensitivity: show within 3 days returns 50', () => {
  const now = new Date('2026-05-30T00:00:00.000Z')
  const showDate = new Date('2026-06-01T00:00:00.000Z')
  assert.equal(computeTimeSensitivity(showDate, now), 50)
})

test('timeSensitivity: show within 7 days returns 25', () => {
  const now = new Date('2026-05-30T00:00:00.000Z')
  const showDate = new Date('2026-06-05T00:00:00.000Z')
  assert.equal(computeTimeSensitivity(showDate, now), 25)
})

test('timeSensitivity: show within 14 days returns 10', () => {
  const now = new Date('2026-05-30T00:00:00.000Z')
  const showDate = new Date('2026-06-10T00:00:00.000Z')
  assert.equal(computeTimeSensitivity(showDate, now), 10)
})

test('timeSensitivity: show beyond 14 days returns 0', () => {
  const now = new Date('2026-05-30T00:00:00.000Z')
  const showDate = new Date('2026-07-30T00:00:00.000Z')
  assert.equal(computeTimeSensitivity(showDate, now), 0)
})

test('timeSensitivity: past show date returns 0', () => {
  const now = new Date('2026-05-30T00:00:00.000Z')
  const showDate = new Date('2026-05-28T00:00:00.000Z')
  assert.equal(computeTimeSensitivity(showDate, now), 0)
})

// ─── Dependency Weight ───────────────────────────────────────────────────────

test('dependencyWeight: critical blocker returns 50', () => {
  const state = makeState({
    severity: 'critical',
    stateCode: 'UNRESOLVED_DEPENDENCY',
    dependencyIds: ['dep:1'],
  })
  assert.equal(computeDependencyWeight(state), 50)
})

test('dependencyWeight: critical blocker + multiple entities returns 60', () => {
  const state = makeState({
    severity: 'critical',
    stateCode: 'UNRESOLVED_DEPENDENCY',
    dependencyIds: ['dep:1', 'dep:2'],
  })
  assert.equal(computeDependencyWeight(state), 60) // 50 + 10
})

test('dependencyWeight: blocked non-critical returns 25', () => {
  const state = makeState({
    severity: 'high',
    stateCode: 'UNRESOLVED_DEPENDENCY',
    dependencyIds: ['dep:1'],
  })
  assert.equal(computeDependencyWeight(state), 25)
})

test('dependencyWeight: GOVERNANCE_BLOCKED returns 25 for non-critical', () => {
  const state = makeState({
    severity: 'medium',
    stateCode: 'GOVERNANCE_BLOCKED',
    dependencyIds: [],
  })
  assert.equal(computeDependencyWeight(state), 25)
})

test('dependencyWeight: no blockers and no dependencies returns 0', () => {
  const state = makeState({
    severity: 'low',
    stateCode: 'STALE_PRESSURE',
    dependencyIds: [],
  })
  assert.equal(computeDependencyWeight(state), 0)
})

test('dependencyWeight: multiple linked entities adds 10 to base', () => {
  const state = makeState({
    severity: 'high',
    stateCode: 'UNRESOLVED_DEPENDENCY',
    dependencyIds: ['dep:1', 'dep:2', 'dep:3'],
  })
  assert.equal(computeDependencyWeight(state), 35) // 25 + 10
})

// ─── Owner Resolution ────────────────────────────────────────────────────────

test('owner: uses resolutionOwner when present', () => {
  const state = makeState({ resolutionOwner: 'Marcus Stone' })
  const { owner } = resolveOwner(state)
  assert.equal(owner, 'Marcus Stone')
})

test('owner: falls back to entityName for person entity type', () => {
  const state = makeState({ resolutionOwner: undefined, entityType: 'person', entityName: 'Jon Hartman' })
  const { owner } = resolveOwner(state)
  assert.equal(owner, 'Jon Hartman')
})

test('owner: falls back to entityType when no resolutionOwner', () => {
  const state = makeState({ resolutionOwner: undefined, entityType: 'governance', entityName: 'Governance Event' })
  const { owner } = resolveOwner(state)
  assert.equal(owner, 'governance')
})

test('owner: never returns blank — falls back to Unassigned', () => {
  const state = makeState({ resolutionOwner: undefined, entityType: '', entityName: '' })
  const { owner } = resolveOwner(state)
  assert.ok(owner.length > 0)
  assert.equal(owner, 'Unassigned')
})

test('owner: ownerId is always the entityId', () => {
  const state = makeState({ entityId: 'entity:venue:001' })
  const { ownerId } = resolveOwner(state)
  assert.equal(ownerId, 'entity:venue:001')
})

// ─── Recommended Action ──────────────────────────────────────────────────────

test('action: RF approval pattern detected in entity name', () => {
  const state = makeState({ entityName: 'Hershey Center RF Approval', stateCode: 'AWAITING_COMMITMENT' })
  assert.equal(resolveRecommendedAction(state), 'Request RF approval')
})

test('action: rider pattern detected', () => {
  const state = makeState({ entityName: 'Artist Rider Acceptance', stateCode: 'AWAITING_COMMITMENT' })
  assert.equal(resolveRecommendedAction(state), 'Follow up with venue regarding rider acceptance')
})

test('action: roster incomplete pattern detected', () => {
  const state = makeState({ entityName: 'Roster Incomplete — Open Role', stateCode: 'UNRESOLVED_DEPENDENCY' })
  assert.equal(resolveRecommendedAction(state), 'Assign open role to complete roster')
})

test('action: GOVERNANCE_BLOCKED resolves to governance action', () => {
  const state = makeState({ entityName: 'Unknown Object', stateCode: 'GOVERNANCE_BLOCKED' })
  assert.equal(resolveRecommendedAction(state), 'Resolve governance blockage to unblock progress')
})

test('action: FINANCING_GATE resolves to financing action', () => {
  const state = makeState({ entityName: 'Budget Approval', stateCode: 'FINANCING_GATE' })
  assert.equal(resolveRecommendedAction(state), 'Advance financing approval to clear gate')
})

test('action: ROUTING_PENDING resolves to routing action', () => {
  const state = makeState({ entityName: 'Routing Plan', stateCode: 'ROUTING_PENDING' })
  assert.equal(resolveRecommendedAction(state), 'Confirm routing and travel arrangements')
})

test('action: AWAITING_COMMITMENT resolves to commitment action', () => {
  const state = makeState({ entityName: 'Some Pending Decision', stateCode: 'AWAITING_COMMITMENT' })
  assert.equal(resolveRecommendedAction(state), 'Request commitment or approval to advance')
})

// ─── Priority Ranking ────────────────────────────────────────────────────────

test('ranking: critical blocker outranks medium blocker', () => {
  const criticalState = makeState({
    stateId: 'state:critical',
    severity: 'critical',
    stateCode: 'UNRESOLVED_DEPENDENCY',
    dependencyIds: ['dep:1'],
  })
  const mediumState = makeState({
    stateId: 'state:medium',
    severity: 'medium',
    stateCode: 'UNRESOLVED_DEPENDENCY',
    dependencyIds: [],
  })
  const projection = makeProjection({
    blockers: [mediumState, criticalState],
    groupedTopology: { critical: 1, high: 0, medium: 1, low: 0, blockers: 2, movement: 0, readiness: 0, escalations: 0 },
  })
  const result = buildFocusEngine(projection)
  assert.equal(result.topFocus?.id, 'state:critical')
})

test('ranking: high blocker outranks low blocker', () => {
  const highState = makeState({ stateId: 'state:high', severity: 'high', stateCode: 'GOVERNANCE_BLOCKED', dependencyIds: [] })
  const lowState = makeState({ stateId: 'state:low', severity: 'low', stateCode: 'STALE_PRESSURE', dependencyIds: [] })
  const projection = makeProjection({
    blockers: [lowState, highState],
    groupedTopology: { critical: 0, high: 1, medium: 0, low: 1, blockers: 2, movement: 0, readiness: 0, escalations: 0 },
  })
  const result = buildFocusEngine(projection)
  assert.equal(result.topFocus?.id, 'state:high')
})

test('ranking: all items sorted by priorityScore descending', () => {
  const a = makeState({ stateId: 'state:a', severity: 'low', stateCode: 'STALE_PRESSURE', dependencyIds: [] })
  const b = makeState({ stateId: 'state:b', severity: 'critical', stateCode: 'UNRESOLVED_DEPENDENCY', dependencyIds: ['dep:1'] })
  const c = makeState({ stateId: 'state:c', severity: 'medium', stateCode: 'GOVERNANCE_BLOCKED', dependencyIds: [] })
  const projection = makeProjection({ blockers: [a, b, c] })
  const result = buildFocusEngine(projection)
  const scores = result.allFocusItems.map((item) => item.priorityScore)
  for (let i = 1; i < scores.length; i++) {
    assert.ok(scores[i - 1] >= scores[i], `Item ${i - 1} score ${scores[i - 1]} should be >= item ${i} score ${scores[i]}`)
  }
})

test('ranking: pressure weighting increases score for escalated items', () => {
  const escalated = makeState({
    stateId: 'state:escalated',
    severity: 'high',
    lifecycle: 'escalated',
    stateCode: 'GOVERNANCE_BLOCKED',
    dependencyIds: [],
  })
  const normal = makeState({
    stateId: 'state:normal',
    severity: 'high',
    lifecycle: 'entered',
    stateCode: 'GOVERNANCE_BLOCKED',
    dependencyIds: [],
  })
  const projection = makeProjection({ blockers: [normal, escalated] })
  const result = buildFocusEngine(projection)
  const escalatedItem = result.allFocusItems.find((i) => i.id === 'state:escalated')
  const normalItem = result.allFocusItems.find((i) => i.id === 'state:normal')
  assert.ok(escalatedItem!.pressureScore > normalItem!.pressureScore)
  assert.ok(escalatedItem!.priorityScore > normalItem!.priorityScore)
})

test('ranking: time sensitivity increases score when show is near', () => {
  const state = makeState({ stateId: 'state:timed', severity: 'medium', stateCode: 'STALE_PRESSURE', dependencyIds: [] })
  const projection = makeProjection({ blockers: [state] })
  const now = new Date('2026-05-30T00:00:00.000Z')
  const nearShow = new Date('2026-06-01T00:00:00.000Z')
  const farShow = new Date('2026-07-30T00:00:00.000Z')
  const resultNear = buildFocusEngine(projection, nearShow)
  const resultFar = buildFocusEngine(projection, farShow)
  assert.ok(resultNear.allFocusItems[0].timeSensitivity > resultFar.allFocusItems[0].timeSensitivity)
  void now
})

// ─── No Evidence = No Focus Items ────────────────────────────────────────────

test('no evidence: empty projection yields empty result', () => {
  const projection = makeProjection()
  const result = buildFocusEngine(projection)
  assert.equal(result.topFocus, null)
  assert.equal(result.secondaryFocus, null)
  assert.equal(result.allFocusItems.length, 0)
})

test('no evidence: READY_TO_ADVANCE states are excluded from focus', () => {
  const state = makeState({ stateCode: 'READY_TO_ADVANCE', severity: 'low' })
  const projection = makeProjection({ blockers: [state] })
  const result = buildFocusEngine(projection)
  assert.equal(result.allFocusItems.length, 0)
})

test('no evidence: ACTIVELY_MOVING states are excluded from focus', () => {
  const state = makeState({ stateCode: 'ACTIVELY_MOVING', severity: 'medium' })
  const projection = makeProjection({ blockers: [state] })
  const result = buildFocusEngine(projection)
  assert.equal(result.allFocusItems.length, 0)
})

// ─── FocusEngineResult Shape ─────────────────────────────────────────────────

test('result shape: topFocus is first item in allFocusItems', () => {
  const a = makeState({ stateId: 'state:a', severity: 'critical', stateCode: 'UNRESOLVED_DEPENDENCY', dependencyIds: ['dep:1'] })
  const b = makeState({ stateId: 'state:b', severity: 'medium', stateCode: 'STALE_PRESSURE', dependencyIds: [] })
  const projection = makeProjection({ blockers: [b, a] })
  const result = buildFocusEngine(projection)
  assert.equal(result.topFocus?.id, result.allFocusItems[0]?.id)
})

test('result shape: secondaryFocus is second item in allFocusItems', () => {
  const a = makeState({ stateId: 'state:a', severity: 'critical', stateCode: 'UNRESOLVED_DEPENDENCY', dependencyIds: ['dep:1'] })
  const b = makeState({ stateId: 'state:b', severity: 'high', stateCode: 'GOVERNANCE_BLOCKED', dependencyIds: [] })
  const c = makeState({ stateId: 'state:c', severity: 'medium', stateCode: 'STALE_PRESSURE', dependencyIds: [] })
  const projection = makeProjection({ blockers: [c, a, b] })
  const result = buildFocusEngine(projection)
  assert.equal(result.secondaryFocus?.id, result.allFocusItems[1]?.id)
})

test('result shape: secondaryFocus is null when only one focus item exists', () => {
  const state = makeState({ stateCode: 'UNRESOLVED_DEPENDENCY', severity: 'critical', dependencyIds: ['dep:1'] })
  const projection = makeProjection({ blockers: [state] })
  const result = buildFocusEngine(projection)
  assert.equal(result.secondaryFocus, null)
})

test('result shape: FocusItem has all required fields', () => {
  const state = makeState()
  const projection = makeProjection({ blockers: [state] })
  const result = buildFocusEngine(projection)
  const item = result.topFocus!
  assert.ok('id' in item)
  assert.ok('title' in item)
  assert.ok('owner' in item)
  assert.ok('ownerId' in item)
  assert.ok('priorityScore' in item)
  assert.ok('impactScore' in item)
  assert.ok('timeSensitivity' in item)
  assert.ok('dependencyWeight' in item)
  assert.ok('pressureScore' in item)
  assert.ok('reason' in item)
  assert.ok('recommendedAction' in item)
  assert.ok('linkedEntities' in item)
  assert.ok('sourceIds' in item)
})

test('result shape: priorityScore equals sum of components', () => {
  const state = makeState({
    severity: 'high',
    lifecycle: 'entered',
    stateCode: 'UNRESOLVED_DEPENDENCY',
    dependencyIds: ['dep:1'],
  })
  const projection = makeProjection({ blockers: [state] })
  const result = buildFocusEngine(projection, null)
  const item = result.topFocus!
  assert.equal(item.priorityScore, item.impactScore + item.pressureScore + item.dependencyWeight + item.timeSensitivity)
})

// ─── Deduplication ───────────────────────────────────────────────────────────

test('deduplication: same stateId in blockers and escalations appears once', () => {
  const state = makeState({ stateId: 'state:shared', severity: 'critical', stateCode: 'ESCALATION_RISK', dependencyIds: [] })
  const projection = makeProjection({
    blockers: [state],
    escalations: [state],
  })
  const result = buildFocusEngine(projection)
  const ids = result.allFocusItems.map((i) => i.id)
  const unique = new Set(ids)
  assert.equal(unique.size, ids.length)
})

// ─── Diagnostics ─────────────────────────────────────────────────────────────

test('diagnostics: confidence is none when no focus items', () => {
  const projection = makeProjection()
  const diagnostics = buildFocusDiagnostics(projection, [])
  assert.equal(diagnostics.confidence, 'none')
})

test('diagnostics: confidence is partial when one focus item', () => {
  const item: FocusItem = {
    id: 'f1', title: 'T', owner: 'Jon', ownerId: 'e1', priorityScore: 50,
    impactScore: 50, timeSensitivity: 0, dependencyWeight: 0, pressureScore: 0,
    reason: 'r', recommendedAction: 'a', linkedEntities: [], sourceIds: [],
  }
  const projection = makeProjection({ blockers: [makeState()] })
  const diagnostics = buildFocusDiagnostics(projection, [item])
  assert.equal(diagnostics.confidence, 'partial')
})

test('diagnostics: confidence is full when two or more focus items', () => {
  const item = (id: string): FocusItem => ({
    id, title: 'T', owner: 'Jon', ownerId: 'e1', priorityScore: 50,
    impactScore: 50, timeSensitivity: 0, dependencyWeight: 0, pressureScore: 0,
    reason: 'r', recommendedAction: 'a', linkedEntities: [], sourceIds: [],
  })
  const projection = makeProjection({
    blockers: [makeState()],
    groupedTopology: { critical: 1, high: 1, medium: 0, low: 0, blockers: 2, movement: 0, readiness: 0, escalations: 0 },
  })
  const diagnostics = buildFocusDiagnostics(projection, [item('f1'), item('f2')])
  assert.equal(diagnostics.confidence, 'full')
})

test('diagnostics: knownSignals lists blockers when present', () => {
  const projection = makeProjection({
    blockers: [makeState()],
    groupedTopology: { critical: 0, high: 0, medium: 0, low: 0, blockers: 1, movement: 0, readiness: 0, escalations: 0 },
  })
  const diagnostics = buildFocusDiagnostics(projection, [])
  assert.ok(diagnostics.knownSignals.some((s) => s.includes('blocker')))
})

test('diagnostics: unknownSignals includes event count warning when derivedFromEventCount is 0', () => {
  const projection = makeProjection({ derivedFromEventCount: 0 })
  const diagnostics = buildFocusDiagnostics(projection, [])
  assert.ok(diagnostics.unknownSignals.some((s) => s.includes('replay events')))
})

test('diagnostics: knownSignals mentions event count when derivedFromEventCount > 0', () => {
  const projection = makeProjection({ derivedFromEventCount: 12 })
  const diagnostics = buildFocusDiagnostics(projection, [])
  assert.ok(diagnostics.knownSignals.some((s) => s.includes('12')))
})

// ─── Integration ─────────────────────────────────────────────────────────────

test('integration: Hershey Center RF Approval example produces correct shape', () => {
  const rfState = makeState({
    stateId: 'state:rf:hershey',
    entityId: 'entity:hershey-center',
    entityName: 'Hershey Center RF Approval',
    severity: 'critical',
    stateCode: 'AWAITING_COMMITMENT',
    lifecycle: 'escalated',
    resolutionOwner: 'Marcus Stone',
    dependencyIds: ['dep:venue-readiness', 'dep:load-in'],
    triggerDetail: 'Blocks venue readiness and impacts load-in timeline.',
    explanation: 'Blocks venue readiness and impacts load-in timeline.',
    sourceEventIds: ['event:rf-pending-001'],
  })
  const projection = makeProjection({
    blockers: [rfState],
    groupedTopology: { critical: 1, high: 0, medium: 0, low: 0, blockers: 1, movement: 0, readiness: 0, escalations: 1 },
  })
  const result = buildFocusEngine(projection)
  const top = result.topFocus!
  assert.equal(top.title, 'Hershey Center RF Approval')
  assert.equal(top.owner, 'Marcus Stone')
  assert.equal(top.recommendedAction, 'Request RF approval')
  assert.ok(top.priorityScore > 0)
  assert.ok(top.reason.includes('load-in'))
})
