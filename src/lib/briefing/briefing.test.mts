import test from 'node:test'
import assert from 'node:assert/strict'

import { buildBriefingEngine, computeCurrentReadiness } from './briefingBuilder'
import { buildBriefingDiagnostics } from './diagnostics'
import type { OperationalProjection, OperationalStateRecord } from '@/lib/runtime/state/model'
import type { FocusEngineResult, FocusItem } from '@/lib/focus/types'
import type { ContinuityEvent } from '@/lib/showtela/types'
import type { BriefingChange } from './types'

// ─── Fixtures ───────────────────────────────────────────────────────────────

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
    groupedTopology: {
      critical: 0, high: 0, medium: 0, low: 0,
      blockers: 0, movement: 0, readiness: 0, escalations: 0,
    },
    summary: {
      currentTruth: '', mattersNow: '', nextMovement: '',
      blockersLabel: '', movementLabel: '', readinessLabel: '',
    },
    ...overrides,
  }
}

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
    triggerDetail: '2 blockers',
    resolutionOwner: 'Marcus Stone',
    dependencyIds: ['dep:1'],
    dependencyChain: ['entity:test', 'dep:1'],
    reasoningChain: [],
    derivationSource: 'dependency-graph',
    sourceEventIds: ['event:abc'],
    derivedAt: '2026-05-30T00:00:00.000Z',
    derivationVersion: 'operational-state.v1',
    ...overrides,
  }
}

function makeFocusItem(overrides: Partial<FocusItem> = {}): FocusItem {
  return {
    id: 'focus:001',
    title: 'Hershey RF Approval',
    owner: 'Marcus Stone',
    ownerId: 'entity:hershey',
    priorityScore: 92,
    impactScore: 75,
    timeSensitivity: 25,
    dependencyWeight: 25,
    pressureScore: 20,
    reason: 'Blocks venue readiness',
    recommendedAction: 'Request RF approval',
    linkedEntities: ['dep:venue'],
    sourceIds: ['event:rf-001'],
    ...overrides,
  }
}

function makeFocusResult(top: FocusItem | null = null, secondary: FocusItem | null = null): FocusEngineResult {
  const all = [top, secondary].filter((i): i is FocusItem => i !== null)
  return { topFocus: top, secondaryFocus: secondary, allFocusItems: all }
}

function makeEvent(overrides: Partial<ContinuityEvent> = {}): ContinuityEvent {
  return {
    id: `event:${Math.random().toString(36).slice(2, 8)}`,
    headline: 'Test continuity event',
    timestamp: '2026-05-30T10:00:00.000Z',
    owner: { id: 'person:jon', name: 'Jon Hartman' },
    ...overrides,
  }
}

// ─── OperationalBrief Shape ──────────────────────────────────────────────────

test('brief: has all required fields', () => {
  const projection = makeProjection()
  const focus = makeFocusResult()
  const brief = buildBriefingEngine({ continuityFeed: [], projection, focusResult: focus })
  assert.ok('headline' in brief)
  assert.ok('generatedAt' in brief)
  assert.ok('newEvents' in brief)
  assert.ok('resolvedItems' in brief)
  assert.ok('newBlockers' in brief)
  assert.ok('currentReadiness' in brief)
  assert.ok('previousReadiness' in brief)
  assert.ok('readinessDelta' in brief)
  assert.ok('topFocus' in brief)
  assert.ok('recommendedAction' in brief)
  assert.ok('changes' in brief)
  assert.ok('improvements' in brief)
  assert.ok('concerns' in brief)
})

test('brief: headline is always "Operational Brief"', () => {
  const brief = buildBriefingEngine({ continuityFeed: [], projection: makeProjection(), focusResult: makeFocusResult() })
  assert.equal(brief.headline, 'Operational Brief')
})

test('brief: generatedAt is a valid ISO timestamp', () => {
  const brief = buildBriefingEngine({ continuityFeed: [], projection: makeProjection(), focusResult: makeFocusResult() })
  assert.ok(!Number.isNaN(Date.parse(brief.generatedAt)))
})

test('brief: topFocus is null when focus engine has no items', () => {
  const brief = buildBriefingEngine({ continuityFeed: [], projection: makeProjection(), focusResult: makeFocusResult() })
  assert.equal(brief.topFocus, null)
})

test('brief: topFocus.title matches focus engine top focus title', () => {
  const item = makeFocusItem({ title: 'Hershey RF Approval' })
  const brief = buildBriefingEngine({ continuityFeed: [], projection: makeProjection(), focusResult: makeFocusResult(item) })
  assert.equal(brief.topFocus?.title, 'Hershey RF Approval')
})

test('brief: topFocus.priority matches focus engine priority score', () => {
  const item = makeFocusItem({ priorityScore: 92 })
  const brief = buildBriefingEngine({ continuityFeed: [], projection: makeProjection(), focusResult: makeFocusResult(item) })
  assert.equal(brief.topFocus?.priority, 92)
})

test('brief: recommendedAction matches focus engine recommended action exactly', () => {
  const item = makeFocusItem({ recommendedAction: 'Obtain RF approval before advance completion deadline.' })
  const brief = buildBriefingEngine({ continuityFeed: [], projection: makeProjection(), focusResult: makeFocusResult(item) })
  assert.equal(brief.recommendedAction, 'Obtain RF approval before advance completion deadline.')
})

test('brief: recommendedAction is empty string when no top focus', () => {
  const brief = buildBriefingEngine({ continuityFeed: [], projection: makeProjection(), focusResult: makeFocusResult() })
  assert.equal(brief.recommendedAction, '')
})

// ─── New Events / Changes ────────────────────────────────────────────────────

test('changes: newEvents equals changes.length', () => {
  const feed = [makeEvent(), makeEvent(), makeEvent()]
  const brief = buildBriefingEngine({ continuityFeed: feed, projection: makeProjection(), focusResult: makeFocusResult() })
  assert.equal(brief.newEvents, brief.changes.length)
  assert.equal(brief.newEvents, 3)
})

test('changes: newEvents is 0 when feed is empty', () => {
  const brief = buildBriefingEngine({ continuityFeed: [], projection: makeProjection(), focusResult: makeFocusResult() })
  assert.equal(brief.newEvents, 0)
  assert.equal(brief.changes.length, 0)
})

test('changes: limited to 10 items even when feed has more', () => {
  const feed = Array.from({ length: 15 }, () => makeEvent())
  const brief = buildBriefingEngine({ continuityFeed: feed, projection: makeProjection(), focusResult: makeFocusResult() })
  assert.equal(brief.changes.length, 10)
  assert.equal(brief.newEvents, 10)
})

test('changes: exactly 10 items when feed has exactly 10', () => {
  const feed = Array.from({ length: 10 }, () => makeEvent())
  const brief = buildBriefingEngine({ continuityFeed: feed, projection: makeProjection(), focusResult: makeFocusResult() })
  assert.equal(brief.changes.length, 10)
})

test('changes: each change has type "new-event"', () => {
  const feed = [makeEvent(), makeEvent()]
  const brief = buildBriefingEngine({ continuityFeed: feed, projection: makeProjection(), focusResult: makeFocusResult() })
  for (const change of brief.changes) {
    assert.equal(change.type, 'new-event')
  }
})

test('changes: preserves feed order (newest first)', () => {
  const feed = [
    makeEvent({ id: 'ev:1', timestamp: '2026-05-30T12:00:00.000Z', headline: 'Newest' }),
    makeEvent({ id: 'ev:2', timestamp: '2026-05-30T10:00:00.000Z', headline: 'Older' }),
    makeEvent({ id: 'ev:3', timestamp: '2026-05-30T08:00:00.000Z', headline: 'Oldest' }),
  ]
  const brief = buildBriefingEngine({ continuityFeed: feed, projection: makeProjection(), focusResult: makeFocusResult() })
  assert.equal(brief.changes[0].id, 'ev:1')
  assert.equal(brief.changes[1].id, 'ev:2')
})

// ─── Resolved Items / Improvements ──────────────────────────────────────────

test('improvements: resolvedItems is 0 when no resolved states', () => {
  const state = makeState({ lifecycle: 'entered' })
  const projection = makeProjection({ states: [state] })
  const brief = buildBriefingEngine({ continuityFeed: [], projection, focusResult: makeFocusResult() })
  assert.equal(brief.resolvedItems, 0)
  assert.equal(brief.improvements.length, 0)
})

test('improvements: resolvedItems counts lifecycle "resolved" states', () => {
  const resolved = makeState({ stateId: 'state:resolved', lifecycle: 'resolved' })
  const entered = makeState({ stateId: 'state:entered', lifecycle: 'entered' })
  const projection = makeProjection({ states: [resolved, entered] })
  const brief = buildBriefingEngine({ continuityFeed: [], projection, focusResult: makeFocusResult() })
  assert.equal(brief.resolvedItems, 1)
  assert.equal(brief.improvements.length, 1)
})

test('improvements: resolvedItems counts lifecycle "superseded" states', () => {
  const superseded = makeState({ stateId: 'state:sup', lifecycle: 'superseded' })
  const projection = makeProjection({ states: [superseded] })
  const brief = buildBriefingEngine({ continuityFeed: [], projection, focusResult: makeFocusResult() })
  assert.equal(brief.resolvedItems, 1)
})

test('improvements: resolved items have type "resolved"', () => {
  const resolved = makeState({ stateId: 'state:res', lifecycle: 'resolved' })
  const projection = makeProjection({ states: [resolved] })
  const brief = buildBriefingEngine({ continuityFeed: [], projection, focusResult: makeFocusResult() })
  assert.equal(brief.improvements[0].type, 'resolved')
})

test('improvements: resolved item headline contains entity name', () => {
  const resolved = makeState({ stateId: 'state:r', lifecycle: 'resolved', entityName: 'Venue Contract' })
  const projection = makeProjection({ states: [resolved] })
  const brief = buildBriefingEngine({ continuityFeed: [], projection, focusResult: makeFocusResult() })
  assert.ok(brief.improvements[0].headline.includes('Venue Contract'))
})

// ─── Blockers / Concerns ─────────────────────────────────────────────────────

test('concerns: newBlockers equals projection.blockers.length', () => {
  const blocker = makeState({ stateId: 'state:b1', severity: 'critical' })
  const projection = makeProjection({ blockers: [blocker], groupedTopology: { critical: 1, high: 0, medium: 0, low: 0, blockers: 1, movement: 0, readiness: 0, escalations: 0 } })
  const brief = buildBriefingEngine({ continuityFeed: [], projection, focusResult: makeFocusResult() })
  assert.equal(brief.newBlockers, 1)
})

test('concerns: newBlockers is 0 when no blockers', () => {
  const brief = buildBriefingEngine({ continuityFeed: [], projection: makeProjection(), focusResult: makeFocusResult() })
  assert.equal(brief.newBlockers, 0)
  assert.equal(brief.concerns.filter(c => c.type === 'new-blocker').length, 0)
})

test('concerns: blocker items have type "new-blocker"', () => {
  const blocker = makeState({ stateId: 'state:bl', severity: 'high' })
  const projection = makeProjection({ blockers: [blocker] })
  const brief = buildBriefingEngine({ continuityFeed: [], projection, focusResult: makeFocusResult() })
  const blockerConcerns = brief.concerns.filter(c => c.type === 'new-blocker')
  assert.equal(blockerConcerns.length, 1)
})

test('concerns: escalation items have type "escalation"', () => {
  const escalation = makeState({ stateId: 'state:esc', lifecycle: 'escalated', severity: 'high' })
  const projection = makeProjection({ escalations: [escalation] })
  const brief = buildBriefingEngine({ continuityFeed: [], projection, focusResult: makeFocusResult() })
  const escalationConcerns = brief.concerns.filter(c => c.type === 'escalation')
  assert.equal(escalationConcerns.length, 1)
})

test('concerns: deduplication — state in both blockers and escalations appears once', () => {
  const state = makeState({ stateId: 'state:shared', lifecycle: 'escalated', severity: 'critical' })
  const projection = makeProjection({ blockers: [state], escalations: [state] })
  const brief = buildBriefingEngine({ continuityFeed: [], projection, focusResult: makeFocusResult() })
  const concernIds = brief.concerns.map(c => c.id)
  const unique = new Set(concernIds)
  assert.equal(unique.size, concernIds.length)
})

// ─── Readiness ───────────────────────────────────────────────────────────────

test('readiness: is 100 when no severity states (clean projection)', () => {
  const projection = makeProjection()
  assert.equal(computeCurrentReadiness(projection), 100)
})

test('readiness: reduced by critical states (15 per critical)', () => {
  const projection = makeProjection({ groupedTopology: { critical: 1, high: 0, medium: 0, low: 0, blockers: 0, movement: 0, readiness: 0, escalations: 0 } })
  assert.equal(computeCurrentReadiness(projection), 85)
})

test('readiness: reduced by high states (8 per high)', () => {
  const projection = makeProjection({ groupedTopology: { critical: 0, high: 2, medium: 0, low: 0, blockers: 0, movement: 0, readiness: 0, escalations: 0 } })
  assert.equal(computeCurrentReadiness(projection), 84)
})

test('readiness: reduced by medium states (4 per medium)', () => {
  const projection = makeProjection({ groupedTopology: { critical: 0, high: 0, medium: 3, low: 0, blockers: 0, movement: 0, readiness: 0, escalations: 0 } })
  assert.equal(computeCurrentReadiness(projection), 88)
})

test('readiness: reduced by low states (2 per low)', () => {
  const projection = makeProjection({ groupedTopology: { critical: 0, high: 0, medium: 0, low: 5, blockers: 0, movement: 0, readiness: 0, escalations: 0 } })
  assert.equal(computeCurrentReadiness(projection), 90)
})

test('readiness: bonus for readiness states (+5 each)', () => {
  // critical=1 → deduction 15, readiness=2 → bonus 10: 100 - 15 + 10 = 95
  const projection = makeProjection({ groupedTopology: { critical: 1, high: 0, medium: 0, low: 0, blockers: 0, movement: 0, readiness: 2, escalations: 0 } })
  assert.equal(computeCurrentReadiness(projection), 95)
})

test('readiness: bonus for movement states (+3 each)', () => {
  // critical=1 → deduction 15, movement=2 → bonus 6: 100 - 15 + 6 = 91
  const projection = makeProjection({ groupedTopology: { critical: 1, high: 0, medium: 0, low: 0, blockers: 0, movement: 2, readiness: 0, escalations: 0 } })
  assert.equal(computeCurrentReadiness(projection), 91)
})

test('readiness: clamped to 0 minimum with heavy deduction', () => {
  const projection = makeProjection({ groupedTopology: { critical: 10, high: 0, medium: 0, low: 0, blockers: 0, movement: 0, readiness: 0, escalations: 0 } })
  assert.equal(computeCurrentReadiness(projection), 0)
})

test('readiness: clamped to 100 maximum with heavy bonus', () => {
  const projection = makeProjection({ groupedTopology: { critical: 0, high: 0, medium: 0, low: 0, blockers: 0, movement: 10, readiness: 10, escalations: 0 } })
  assert.equal(computeCurrentReadiness(projection), 100)
})

test('readiness: previousReadiness defaults to 0', () => {
  const brief = buildBriefingEngine({ continuityFeed: [], projection: makeProjection(), focusResult: makeFocusResult() })
  assert.equal(brief.previousReadiness, 0)
})

test('readiness: readinessDelta = currentReadiness - previousReadiness (positive)', () => {
  const brief = buildBriefingEngine({ continuityFeed: [], projection: makeProjection(), focusResult: makeFocusResult(), previousReadiness: 70 })
  assert.equal(brief.readinessDelta, brief.currentReadiness - 70)
  assert.ok(brief.readinessDelta >= 0)
})

test('readiness: readinessDelta is negative when previousReadiness exceeds current', () => {
  const projection = makeProjection({ groupedTopology: { critical: 2, high: 0, medium: 0, low: 0, blockers: 0, movement: 0, readiness: 0, escalations: 0 } })
  const brief = buildBriefingEngine({ continuityFeed: [], projection, focusResult: makeFocusResult(), previousReadiness: 90 })
  assert.ok(brief.readinessDelta < 0)
})

test('readiness: readinessDelta is 0 when previousReadiness equals current', () => {
  const projection = makeProjection()
  const brief = buildBriefingEngine({ continuityFeed: [], projection, focusResult: makeFocusResult(), previousReadiness: 100 })
  assert.equal(brief.readinessDelta, 0)
})

// ─── BriefingChange Shape ────────────────────────────────────────────────────

test('change shape: each BriefingChange has all required fields', () => {
  const feed = [makeEvent()]
  const brief = buildBriefingEngine({ continuityFeed: feed, projection: makeProjection(), focusResult: makeFocusResult() })
  const change = brief.changes[0]
  assert.ok('id' in change)
  assert.ok('headline' in change)
  assert.ok('timestamp' in change)
  assert.ok('owner' in change)
  assert.ok('type' in change)
})

test('change shape: owner is never blank in changes', () => {
  const feed = [makeEvent({ owner: undefined }), makeEvent({ owner: { id: 'p:1', name: '' } })]
  const brief = buildBriefingEngine({ continuityFeed: feed, projection: makeProjection(), focusResult: makeFocusResult() })
  for (const change of brief.changes) {
    assert.ok(change.owner.length > 0, `owner should not be blank, got: "${change.owner}"`)
  }
})

test('change shape: owner is never blank in concerns', () => {
  const state = makeState({ resolutionOwner: undefined, entityName: '' })
  const projection = makeProjection({ blockers: [state] })
  const brief = buildBriefingEngine({ continuityFeed: [], projection, focusResult: makeFocusResult() })
  for (const concern of brief.concerns) {
    assert.ok(concern.owner.length > 0, `concern owner should not be blank`)
  }
})

test('change shape: owner is never blank in improvements', () => {
  const resolved = makeState({ lifecycle: 'resolved', resolutionOwner: undefined, entityName: '' })
  const projection = makeProjection({ states: [resolved] })
  const brief = buildBriefingEngine({ continuityFeed: [], projection, focusResult: makeFocusResult() })
  for (const improvement of brief.improvements) {
    assert.ok(improvement.owner.length > 0, `improvement owner should not be blank`)
  }
})

// ─── Focus Integration ───────────────────────────────────────────────────────

test('focus: topFocus consumed directly from focus engine — not recalculated', () => {
  const item = makeFocusItem({ title: 'Exact Title From Engine', priorityScore: 137 })
  const brief = buildBriefingEngine({ continuityFeed: [], projection: makeProjection(), focusResult: makeFocusResult(item) })
  assert.equal(brief.topFocus?.title, 'Exact Title From Engine')
  assert.equal(brief.topFocus?.priority, 137)
})

test('focus: recommendedAction propagated exactly from focus engine without modification', () => {
  const item = makeFocusItem({ recommendedAction: 'Follow up with venue regarding rider acceptance' })
  const brief = buildBriefingEngine({ continuityFeed: [], projection: makeProjection(), focusResult: makeFocusResult(item) })
  assert.equal(brief.recommendedAction, 'Follow up with venue regarding rider acceptance')
})

// ─── No Evidence Behavior ────────────────────────────────────────────────────

test('no evidence: empty projection + empty feed yields minimal brief with 0 counts', () => {
  const brief = buildBriefingEngine({ continuityFeed: [], projection: makeProjection(), focusResult: makeFocusResult() })
  assert.equal(brief.newEvents, 0)
  assert.equal(brief.resolvedItems, 0)
  assert.equal(brief.newBlockers, 0)
  assert.equal(brief.changes.length, 0)
  assert.equal(brief.improvements.length, 0)
  assert.equal(brief.concerns.length, 0)
})

test('no evidence: empty feed still generates concerns from projection blockers', () => {
  const blocker = makeState({ stateId: 'state:bl', severity: 'critical' })
  const projection = makeProjection({ blockers: [blocker] })
  const brief = buildBriefingEngine({ continuityFeed: [], projection, focusResult: makeFocusResult() })
  assert.equal(brief.newEvents, 0)
  assert.ok(brief.concerns.length > 0)
  assert.equal(brief.newBlockers, 1)
})

test('no evidence: empty projection still generates changes from feed', () => {
  const feed = [makeEvent(), makeEvent()]
  const brief = buildBriefingEngine({ continuityFeed: feed, projection: makeProjection(), focusResult: makeFocusResult() })
  assert.equal(brief.newBlockers, 0)
  assert.equal(brief.changes.length, 2)
  assert.equal(brief.newEvents, 2)
})

// ─── Diagnostics ─────────────────────────────────────────────────────────────

test('diagnostics: confidence is "none" when empty projection and empty feed', () => {
  const brief = buildBriefingEngine({ continuityFeed: [], projection: makeProjection({ derivedFromEventCount: 0 }), focusResult: makeFocusResult() })
  const diagnostics = buildBriefingDiagnostics(brief, makeProjection({ derivedFromEventCount: 0 }))
  assert.equal(diagnostics.confidence, 'none')
})

test('diagnostics: confidence is "full" when both feed and blockers are present', () => {
  const feed = [makeEvent()]
  const blocker = makeState({ stateId: 'state:bl' })
  const projection = makeProjection({ blockers: [blocker], derivedFromEventCount: 3 })
  const brief = buildBriefingEngine({ continuityFeed: feed, projection, focusResult: makeFocusResult() })
  const diagnostics = buildBriefingDiagnostics(brief, projection)
  assert.equal(diagnostics.confidence, 'full')
})

test('diagnostics: confidence is "partial" when only feed is present', () => {
  const feed = [makeEvent()]
  const projection = makeProjection({ derivedFromEventCount: 3 })
  const brief = buildBriefingEngine({ continuityFeed: feed, projection, focusResult: makeFocusResult() })
  const diagnostics = buildBriefingDiagnostics(brief, projection)
  assert.equal(diagnostics.confidence, 'partial')
})

test('diagnostics: knownSignals includes event count when feed has items', () => {
  const feed = [makeEvent(), makeEvent()]
  const projection = makeProjection()
  const brief = buildBriefingEngine({ continuityFeed: feed, projection, focusResult: makeFocusResult() })
  const diagnostics = buildBriefingDiagnostics(brief, projection)
  assert.ok(diagnostics.knownSignals.some(s => s.includes('2')))
})

test('diagnostics: unknownSignals notes empty feed', () => {
  const projection = makeProjection({ derivedFromEventCount: 0 })
  const brief = buildBriefingEngine({ continuityFeed: [], projection, focusResult: makeFocusResult() })
  const diagnostics = buildBriefingDiagnostics(brief, projection)
  assert.ok(diagnostics.unknownSignals.some(s => s.toLowerCase().includes('event')))
})

test('diagnostics: knownSignals includes blocker count when blockers present', () => {
  const blocker = makeState({ stateId: 'state:bl' })
  const projection = makeProjection({ blockers: [blocker], derivedFromEventCount: 2 })
  const brief = buildBriefingEngine({ continuityFeed: [], projection, focusResult: makeFocusResult() })
  const diagnostics = buildBriefingDiagnostics(brief, projection)
  assert.ok(diagnostics.knownSignals.some(s => s.includes('blocker')))
})

test('diagnostics: unknownSignals notes no focus when topFocus is null', () => {
  const projection = makeProjection({ derivedFromEventCount: 0 })
  const brief = buildBriefingEngine({ continuityFeed: [], projection, focusResult: makeFocusResult() })
  const diagnostics = buildBriefingDiagnostics(brief, projection)
  assert.ok(diagnostics.unknownSignals.some(s => s.toLowerCase().includes('focus')))
})

test('diagnostics: knownSignals mentions top focus title when present', () => {
  const item = makeFocusItem({ title: 'RF Gate Approval' })
  const projection = makeProjection({ derivedFromEventCount: 2 })
  const brief = buildBriefingEngine({ continuityFeed: [], projection, focusResult: makeFocusResult(item) })
  const diagnostics = buildBriefingDiagnostics(brief, projection)
  assert.ok(diagnostics.knownSignals.some(s => s.includes('RF Gate Approval')))
})

// ─── Integration ─────────────────────────────────────────────────────────────

test('integration: full brief matches success condition shape', () => {
  const blocker = makeState({
    stateId: 'state:rf:hershey',
    entityName: 'Hershey RF Approval',
    severity: 'critical',
    stateCode: 'AWAITING_COMMITMENT',
    lifecycle: 'escalated',
    resolutionOwner: 'Marcus Stone',
    dependencyIds: ['dep:venue', 'dep:load-in'],
  })
  const projection = makeProjection({
    blockers: [blocker],
    derivedFromEventCount: 7,
    groupedTopology: { critical: 1, high: 0, medium: 0, low: 0, blockers: 1, movement: 0, readiness: 0, escalations: 1 },
  })
  const item = makeFocusItem({
    title: 'Hershey RF Approval',
    priorityScore: 92,
    recommendedAction: 'Obtain RF approval before advance completion deadline.',
  })
  const feed = Array.from({ length: 7 }, (_, i) => makeEvent({ id: `ev:${i}` }))
  const brief = buildBriefingEngine({
    continuityFeed: feed,
    projection,
    focusResult: makeFocusResult(item),
    previousReadiness: 71,
  })

  assert.equal(brief.headline, 'Operational Brief')
  assert.equal(brief.newEvents, 7)
  assert.equal(brief.newBlockers, 1)
  assert.equal(brief.topFocus?.title, 'Hershey RF Approval')
  assert.equal(brief.topFocus?.priority, 92)
  assert.equal(brief.recommendedAction, 'Obtain RF approval before advance completion deadline.')
  assert.equal(brief.previousReadiness, 71)
  assert.ok(brief.currentReadiness < 100)
  assert.ok(brief.readinessDelta !== 0)
})

test('integration: changes count equals newEvents field', () => {
  const feed = [makeEvent(), makeEvent(), makeEvent(), makeEvent(), makeEvent()]
  const brief = buildBriefingEngine({ continuityFeed: feed, projection: makeProjection(), focusResult: makeFocusResult() })
  assert.equal(brief.changes.length, brief.newEvents)
})
