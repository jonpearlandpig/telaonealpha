import test from 'node:test'
import assert from 'node:assert/strict'

import { buildReplayEngine, deriveExplanation, deriveResultingState } from './replayBuilder'
import { buildReplayDiagnostics } from './diagnostics'
import type { OperationalProjection } from '@/lib/runtime/state/model'
import type { FocusEngineResult, FocusItem } from '@/lib/focus/types'
import type { ContinuityEvent } from '@/lib/showtela/types'

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
    linkedEntities: [],
    sourceIds: [],
    ...overrides,
  }
}

function makeFocusResult(top: FocusItem | null = null): FocusEngineResult {
  return { topFocus: top, secondaryFocus: null, allFocusItems: top ? [top] : [] }
}

function makeEvent(overrides: Partial<ContinuityEvent> = {}): ContinuityEvent {
  return {
    id: `event:${Math.random().toString(36).slice(2, 8)}`,
    headline: 'Operational continuity recorded',
    timestamp: '2026-05-30T10:00:00.000Z',
    owner: { id: 'person:jon', name: 'Jon Hartman' },
    linkedEntities: [],
    ...overrides,
  }
}

// ─── ReplayOutput Shape ──────────────────────────────────────────────────────

test('output: has all required fields', () => {
  const replay = buildReplayEngine({ continuityFeed: [], projection: makeProjection(), focusResult: makeFocusResult(), currentReadiness: 80 })
  assert.ok('generatedAt' in replay)
  assert.ok('stepCount' in replay)
  assert.ok('currentReadiness' in replay)
  assert.ok('topFocus' in replay)
  assert.ok('timeline' in replay)
})

test('output: stepCount equals timeline.length', () => {
  const feed = [makeEvent(), makeEvent(), makeEvent()]
  const replay = buildReplayEngine({ continuityFeed: feed, projection: makeProjection(), focusResult: makeFocusResult(), currentReadiness: 80 })
  assert.equal(replay.stepCount, 3)
  assert.equal(replay.stepCount, replay.timeline.length)
})

test('output: generatedAt is valid ISO timestamp', () => {
  const replay = buildReplayEngine({ continuityFeed: [], projection: makeProjection(), focusResult: makeFocusResult(), currentReadiness: 80 })
  assert.ok(!Number.isNaN(Date.parse(replay.generatedAt)))
})

test('output: currentReadiness matches input value', () => {
  const replay = buildReplayEngine({ continuityFeed: [], projection: makeProjection(), focusResult: makeFocusResult(), currentReadiness: 72 })
  assert.equal(replay.currentReadiness, 72)
})

test('output: topFocus is null when no focus items', () => {
  const replay = buildReplayEngine({ continuityFeed: [], projection: makeProjection(), focusResult: makeFocusResult(), currentReadiness: 80 })
  assert.equal(replay.topFocus, null)
})

test('output: topFocus.title matches focus engine', () => {
  const item = makeFocusItem({ title: 'RF Gate Approval', priorityScore: 88 })
  const replay = buildReplayEngine({ continuityFeed: [], projection: makeProjection(), focusResult: makeFocusResult(item), currentReadiness: 80 })
  assert.equal(replay.topFocus?.title, 'RF Gate Approval')
  assert.equal(replay.topFocus?.priority, 88)
})

test('output: empty feed produces empty timeline', () => {
  const replay = buildReplayEngine({ continuityFeed: [], projection: makeProjection(), focusResult: makeFocusResult(), currentReadiness: 80 })
  assert.equal(replay.timeline.length, 0)
})

// ─── Timeline Sorting ────────────────────────────────────────────────────────

test('sorting: timeline sorted oldest → newest', () => {
  const feed = [
    makeEvent({ id: 'ev:c', timestamp: '2026-05-30T12:00:00.000Z', headline: 'Newest' }),
    makeEvent({ id: 'ev:a', timestamp: '2026-05-30T08:00:00.000Z', headline: 'Oldest' }),
    makeEvent({ id: 'ev:b', timestamp: '2026-05-30T10:00:00.000Z', headline: 'Middle' }),
  ]
  const replay = buildReplayEngine({ continuityFeed: feed, projection: makeProjection(), focusResult: makeFocusResult(), currentReadiness: 80 })
  assert.equal(replay.timeline[0].id, 'ev:a')
  assert.equal(replay.timeline[1].id, 'ev:b')
  assert.equal(replay.timeline[2].id, 'ev:c')
})

test('sorting: oldest event is at index 0', () => {
  const feed = [
    makeEvent({ id: 'ev:new', timestamp: '2026-06-01T00:00:00.000Z' }),
    makeEvent({ id: 'ev:old', timestamp: '2026-05-01T00:00:00.000Z' }),
  ]
  const replay = buildReplayEngine({ continuityFeed: feed, projection: makeProjection(), focusResult: makeFocusResult(), currentReadiness: 80 })
  assert.equal(replay.timeline[0].id, 'ev:old')
})

test('sorting: newest event is at last index', () => {
  const feed = [
    makeEvent({ id: 'ev:new', timestamp: '2026-06-01T00:00:00.000Z' }),
    makeEvent({ id: 'ev:old', timestamp: '2026-05-01T00:00:00.000Z' }),
  ]
  const replay = buildReplayEngine({ continuityFeed: feed, projection: makeProjection(), focusResult: makeFocusResult(), currentReadiness: 80 })
  assert.equal(replay.timeline[replay.timeline.length - 1].id, 'ev:new')
})

test('sorting: does not mutate original feed order', () => {
  const feed = [
    makeEvent({ id: 'ev:new', timestamp: '2026-06-01T00:00:00.000Z' }),
    makeEvent({ id: 'ev:old', timestamp: '2026-05-01T00:00:00.000Z' }),
  ]
  buildReplayEngine({ continuityFeed: feed, projection: makeProjection(), focusResult: makeFocusResult(), currentReadiness: 80 })
  assert.equal(feed[0].id, 'ev:new')
})

// ─── ReplayStep Shape ────────────────────────────────────────────────────────

test('step shape: has all required fields', () => {
  const feed = [makeEvent()]
  const replay = buildReplayEngine({ continuityFeed: feed, projection: makeProjection(), focusResult: makeFocusResult(), currentReadiness: 80 })
  const step = replay.timeline[0]
  assert.ok('id' in step)
  assert.ok('timestamp' in step)
  assert.ok('headline' in step)
  assert.ok('owner' in step)
  assert.ok('linkedEntities' in step)
  assert.ok('resultingState' in step)
  assert.ok('explanation' in step)
  assert.ok('readinessDelta' in step)
  assert.ok('isBlocker' in step)
  assert.ok('isFocusRelated' in step)
  assert.ok('isResolution' in step)
})

test('step shape: step id matches event id', () => {
  const ev = makeEvent({ id: 'event:specific-id' })
  const replay = buildReplayEngine({ continuityFeed: [ev], projection: makeProjection(), focusResult: makeFocusResult(), currentReadiness: 80 })
  assert.equal(replay.timeline[0].id, 'event:specific-id')
})

test('step shape: step headline matches event headline', () => {
  const ev = makeEvent({ headline: 'Venue advance completed for Hershey Center' })
  const replay = buildReplayEngine({ continuityFeed: [ev], projection: makeProjection(), focusResult: makeFocusResult(), currentReadiness: 80 })
  assert.equal(replay.timeline[0].headline, 'Venue advance completed for Hershey Center')
})

test('step shape: linkedEntities matches event linkedEntities', () => {
  const ev = makeEvent({ linkedEntities: ['entity:hershey', 'entity:marcus'] })
  const replay = buildReplayEngine({ continuityFeed: [ev], projection: makeProjection(), focusResult: makeFocusResult(), currentReadiness: 80 })
  assert.deepEqual(replay.timeline[0].linkedEntities, ['entity:hershey', 'entity:marcus'])
})

test('step shape: linkedEntities is empty array when event has none', () => {
  const ev = makeEvent({ linkedEntities: undefined })
  const replay = buildReplayEngine({ continuityFeed: [ev], projection: makeProjection(), focusResult: makeFocusResult(), currentReadiness: 80 })
  assert.deepEqual(replay.timeline[0].linkedEntities, [])
})

// ─── resultingState Derivation ───────────────────────────────────────────────

test('state: BLOCKER_CREATED when blockedBy is set', () => {
  const ev = makeEvent({ blockedBy: 'RF approval pending' })
  assert.equal(deriveResultingState(ev), 'BLOCKER_CREATED')
})

test('state: BLOCKER_CREATED when unresolvedDependencies present', () => {
  const ev = makeEvent({ unresolvedDependencies: ['dep:venue', 'dep:rf'] })
  assert.equal(deriveResultingState(ev), 'BLOCKER_CREATED')
})

test('state: BLOCKER_CREATED when unresolvedMarkers present', () => {
  const ev = makeEvent({ unresolvedMarkers: ['MARKER_RF_PENDING'] })
  assert.equal(deriveResultingState(ev), 'BLOCKER_CREATED')
})

test('state: BLOCKER_RESOLVED when headline contains "resolved" and no active blocks', () => {
  const ev = makeEvent({ headline: 'RF approval resolved — venue cleared' })
  assert.equal(deriveResultingState(ev), 'BLOCKER_RESOLVED')
})

test('state: BLOCKER_RESOLVED when headline contains "approved" and no active blocks', () => {
  const ev = makeEvent({ headline: 'Contract approved and signed' })
  assert.equal(deriveResultingState(ev), 'BLOCKER_RESOLVED')
})

test('state: BLOCKER_RESOLVED when headline contains "confirmed"', () => {
  const ev = makeEvent({ headline: 'Deposit confirmed by venue' })
  assert.equal(deriveResultingState(ev), 'BLOCKER_RESOLVED')
})

test('state: DEPENDENCY_CLEARED when waitingOn is set and resolution signal present', () => {
  const ev = makeEvent({ headline: 'Hotel rooms confirmed', waitingOn: 'hotel confirmation' })
  assert.equal(deriveResultingState(ev), 'DEPENDENCY_CLEARED')
})

test('state: PRESSURE_INCREASED when pressure is "high"', () => {
  const ev = makeEvent({ pressure: 'high' })
  assert.equal(deriveResultingState(ev), 'PRESSURE_INCREASED')
})

test('state: PRESSURE_INCREASED when pressure is "critical"', () => {
  const ev = makeEvent({ pressure: 'critical' })
  assert.equal(deriveResultingState(ev), 'PRESSURE_INCREASED')
})

test('state: PRESSURE_INCREASED when operationalRisk is "high"', () => {
  const ev = makeEvent({ operationalRisk: 'high' })
  assert.equal(deriveResultingState(ev), 'PRESSURE_INCREASED')
})

test('state: PRESSURE_INCREASED when operationalRisk is "critical"', () => {
  const ev = makeEvent({ operationalRisk: 'critical' })
  assert.equal(deriveResultingState(ev), 'PRESSURE_INCREASED')
})

test('state: PRESSURE_DECREASED when pressure is "low" and no blockers', () => {
  const ev = makeEvent({ pressure: 'low' })
  assert.equal(deriveResultingState(ev), 'PRESSURE_DECREASED')
})

test('state: FOCUS_EVENT when headline contains "rider"', () => {
  const ev = makeEvent({ headline: 'Rider requirements submitted to venue' })
  assert.equal(deriveResultingState(ev), 'FOCUS_EVENT')
})

test('state: FOCUS_EVENT when headline contains "advance"', () => {
  const ev = makeEvent({ headline: 'Venue advance call scheduled' })
  assert.equal(deriveResultingState(ev), 'FOCUS_EVENT')
})

test('state: FOCUS_EVENT when headline contains "roster"', () => {
  const ev = makeEvent({ headline: 'Tour roster updated' })
  assert.equal(deriveResultingState(ev), 'FOCUS_EVENT')
})

test('state: DEPENDENCY_ADDED when waitingOn is set and no resolution signal', () => {
  const ev = makeEvent({ headline: 'Waiting on hotel confirmation', waitingOn: 'hotel' })
  assert.equal(deriveResultingState(ev), 'DEPENDENCY_ADDED')
})

test('state: CONTINUITY_RECORDED as default when no signals match', () => {
  const ev = makeEvent({ headline: 'Bus manifest filed by logistics team' })
  assert.equal(deriveResultingState(ev), 'CONTINUITY_RECORDED')
})

// ─── Explanation Derivation ──────────────────────────────────────────────────

test('explanation: mentions blockedBy when present', () => {
  const ev = makeEvent({ blockedBy: 'RF approval' })
  const explanation = deriveExplanation(ev, 'BLOCKER_CREATED')
  assert.ok(explanation.toLowerCase().includes('rf approval'))
})

test('explanation: mentions waitingOn when present', () => {
  const ev = makeEvent({ waitingOn: 'venue confirmation' })
  const explanation = deriveExplanation(ev, 'DEPENDENCY_ADDED')
  assert.ok(explanation.toLowerCase().includes('venue confirmation'))
})

test('explanation: mentions unresolved dependency count', () => {
  const ev = makeEvent({ unresolvedDependencies: ['dep:a', 'dep:b', 'dep:c'] })
  const explanation = deriveExplanation(ev, 'BLOCKER_CREATED')
  assert.ok(explanation.includes('3'))
})

test('explanation: mentions pressure level when high', () => {
  const ev = makeEvent({ pressure: 'high' })
  const explanation = deriveExplanation(ev, 'PRESSURE_INCREASED')
  assert.ok(explanation.toLowerCase().includes('high'))
})

test('explanation: mentions operational risk when elevated', () => {
  const ev = makeEvent({ operationalRisk: 'critical' })
  const explanation = deriveExplanation(ev, 'PRESSURE_INCREASED')
  assert.ok(explanation.toLowerCase().includes('critical'))
})

test('explanation: fallback is meaningful (not empty)', () => {
  const ev = makeEvent({ headline: 'Generic event' })
  const explanation = deriveExplanation(ev, 'CONTINUITY_RECORDED')
  assert.ok(explanation.length > 0)
  assert.ok(explanation.toLowerCase().includes('continuity') || explanation.toLowerCase().includes('operational') || explanation.toLowerCase().includes('recorded'))
})

test('explanation: never blank for any resultingState', () => {
  const states = ['BLOCKER_CREATED', 'BLOCKER_RESOLVED', 'PRESSURE_INCREASED', 'PRESSURE_DECREASED', 'DEPENDENCY_ADDED', 'DEPENDENCY_CLEARED', 'FOCUS_EVENT', 'CONTINUITY_RECORDED'] as const
  const ev = makeEvent()
  for (const state of states) {
    const explanation = deriveExplanation(ev, state)
    assert.ok(explanation.length > 0, `Explanation should not be blank for state: ${state}`)
  }
})

// ─── readinessDelta ──────────────────────────────────────────────────────────

test('delta: BLOCKER_CREATED reduces readiness (-5)', () => {
  const ev = makeEvent({ blockedBy: 'pending approval' })
  const replay = buildReplayEngine({ continuityFeed: [ev], projection: makeProjection(), focusResult: makeFocusResult(), currentReadiness: 80 })
  assert.equal(replay.timeline[0].readinessDelta, -5)
})

test('delta: BLOCKER_RESOLVED increases readiness (+5)', () => {
  const ev = makeEvent({ headline: 'RF approval resolved' })
  const replay = buildReplayEngine({ continuityFeed: [ev], projection: makeProjection(), focusResult: makeFocusResult(), currentReadiness: 80 })
  assert.equal(replay.timeline[0].readinessDelta, 5)
})

test('delta: PRESSURE_INCREASED reduces readiness (-3)', () => {
  const ev = makeEvent({ pressure: 'high' })
  const replay = buildReplayEngine({ continuityFeed: [ev], projection: makeProjection(), focusResult: makeFocusResult(), currentReadiness: 80 })
  assert.equal(replay.timeline[0].readinessDelta, -3)
})

test('delta: CONTINUITY_RECORDED has 0 delta', () => {
  const ev = makeEvent({ headline: 'Team check-in' })
  const replay = buildReplayEngine({ continuityFeed: [ev], projection: makeProjection(), focusResult: makeFocusResult(), currentReadiness: 80 })
  assert.equal(replay.timeline[0].readinessDelta, 0)
})

test('delta: DEPENDENCY_CLEARED increases readiness (+3)', () => {
  const ev = makeEvent({ headline: 'Hotel rooms confirmed', waitingOn: 'hotel' })
  const replay = buildReplayEngine({ continuityFeed: [ev], projection: makeProjection(), focusResult: makeFocusResult(), currentReadiness: 80 })
  assert.equal(replay.timeline[0].readinessDelta, 3)
})

// ─── isBlocker / isFocusRelated / isResolution ───────────────────────────────

test('flags: isBlocker true when BLOCKER_CREATED', () => {
  const ev = makeEvent({ blockedBy: 'approval missing' })
  const replay = buildReplayEngine({ continuityFeed: [ev], projection: makeProjection(), focusResult: makeFocusResult(), currentReadiness: 80 })
  assert.equal(replay.timeline[0].isBlocker, true)
})

test('flags: isBlocker false when CONTINUITY_RECORDED', () => {
  const ev = makeEvent({ headline: 'Status update recorded' })
  const replay = buildReplayEngine({ continuityFeed: [ev], projection: makeProjection(), focusResult: makeFocusResult(), currentReadiness: 80 })
  assert.equal(replay.timeline[0].isBlocker, false)
})

test('flags: isFocusRelated true for RF-related events', () => {
  const ev = makeEvent({ headline: 'RF approval still outstanding' })
  const replay = buildReplayEngine({ continuityFeed: [ev], projection: makeProjection(), focusResult: makeFocusResult(), currentReadiness: 80 })
  assert.equal(replay.timeline[0].isFocusRelated, true)
})

test('flags: isFocusRelated true for rider-related events', () => {
  const ev = makeEvent({ headline: 'Rider submitted to Hershey venue' })
  const replay = buildReplayEngine({ continuityFeed: [ev], projection: makeProjection(), focusResult: makeFocusResult(), currentReadiness: 80 })
  assert.equal(replay.timeline[0].isFocusRelated, true)
})

test('flags: isFocusRelated true for advance-related events', () => {
  const ev = makeEvent({ headline: 'Venue advance call completed' })
  const replay = buildReplayEngine({ continuityFeed: [ev], projection: makeProjection(), focusResult: makeFocusResult(), currentReadiness: 80 })
  assert.equal(replay.timeline[0].isFocusRelated, true)
})

test('flags: isFocusRelated false for unrelated events', () => {
  const ev = makeEvent({ headline: 'Team arrived at hotel', pressure: 'medium' })
  const replay = buildReplayEngine({ continuityFeed: [ev], projection: makeProjection(), focusResult: makeFocusResult(), currentReadiness: 80 })
  assert.equal(replay.timeline[0].isFocusRelated, false)
})

test('flags: isResolution true when BLOCKER_RESOLVED', () => {
  const ev = makeEvent({ headline: 'Contract approved' })
  const replay = buildReplayEngine({ continuityFeed: [ev], projection: makeProjection(), focusResult: makeFocusResult(), currentReadiness: 80 })
  assert.equal(replay.timeline[0].isResolution, true)
})

test('flags: isResolution true when DEPENDENCY_CLEARED', () => {
  const ev = makeEvent({ headline: 'Hotel rooms confirmed', waitingOn: 'hotel' })
  const replay = buildReplayEngine({ continuityFeed: [ev], projection: makeProjection(), focusResult: makeFocusResult(), currentReadiness: 80 })
  assert.equal(replay.timeline[0].isResolution, true)
})

test('flags: isResolution false when BLOCKER_CREATED', () => {
  const ev = makeEvent({ blockedBy: 'approval pending' })
  const replay = buildReplayEngine({ continuityFeed: [ev], projection: makeProjection(), focusResult: makeFocusResult(), currentReadiness: 80 })
  assert.equal(replay.timeline[0].isResolution, false)
})

// ─── Owner Resolution ────────────────────────────────────────────────────────

test('owner: uses event.owner.name when present', () => {
  const ev = makeEvent({ owner: { id: 'p:marcus', name: 'Marcus Stone' } })
  const replay = buildReplayEngine({ continuityFeed: [ev], projection: makeProjection(), focusResult: makeFocusResult(), currentReadiness: 80 })
  assert.equal(replay.timeline[0].owner, 'Marcus Stone')
})

test('owner: falls back to "Unassigned" when owner is undefined', () => {
  const ev = makeEvent({ owner: undefined })
  const replay = buildReplayEngine({ continuityFeed: [ev], projection: makeProjection(), focusResult: makeFocusResult(), currentReadiness: 80 })
  assert.equal(replay.timeline[0].owner, 'Unassigned')
})

test('owner: falls back to "Unassigned" when owner.name is empty', () => {
  const ev = makeEvent({ owner: { id: 'p:1', name: '' } })
  const replay = buildReplayEngine({ continuityFeed: [ev], projection: makeProjection(), focusResult: makeFocusResult(), currentReadiness: 80 })
  assert.equal(replay.timeline[0].owner, 'Unassigned')
})

test('owner: never blank across all steps', () => {
  const feed = [
    makeEvent({ owner: undefined }),
    makeEvent({ owner: { id: 'p:jon', name: 'Jon Hartman' } }),
    makeEvent({ owner: { id: 'p:x', name: '' } }),
  ]
  const replay = buildReplayEngine({ continuityFeed: feed, projection: makeProjection(), focusResult: makeFocusResult(), currentReadiness: 80 })
  for (const step of replay.timeline) {
    assert.ok(step.owner.length > 0, `Owner should not be blank`)
  }
})

// ─── Step ID Uniqueness ──────────────────────────────────────────────────────

test('ids: step IDs are unique across timeline', () => {
  const feed = Array.from({ length: 10 }, (_, i) => makeEvent({ id: `event:unique-${i}` }))
  const replay = buildReplayEngine({ continuityFeed: feed, projection: makeProjection(), focusResult: makeFocusResult(), currentReadiness: 80 })
  const ids = replay.timeline.map((s) => s.id)
  const unique = new Set(ids)
  assert.equal(unique.size, ids.length)
})

// ─── Diagnostics ─────────────────────────────────────────────────────────────

test('diagnostics: confidence "none" when empty timeline', () => {
  const replay = buildReplayEngine({ continuityFeed: [], projection: makeProjection({ derivedFromEventCount: 0 }), focusResult: makeFocusResult(), currentReadiness: 80 })
  const diagnostics = buildReplayDiagnostics(replay, makeProjection({ derivedFromEventCount: 0 }))
  assert.equal(diagnostics.confidence, 'none')
})

test('diagnostics: confidence "full" when 10+ steps', () => {
  const feed = Array.from({ length: 12 }, () => makeEvent())
  const projection = makeProjection({ derivedFromEventCount: 12 })
  const replay = buildReplayEngine({ continuityFeed: feed, projection, focusResult: makeFocusResult(), currentReadiness: 80 })
  const diagnostics = buildReplayDiagnostics(replay, projection)
  assert.equal(diagnostics.confidence, 'full')
})

test('diagnostics: confidence "partial" when 1-9 steps', () => {
  const feed = [makeEvent(), makeEvent(), makeEvent()]
  const projection = makeProjection({ derivedFromEventCount: 3 })
  const replay = buildReplayEngine({ continuityFeed: feed, projection, focusResult: makeFocusResult(), currentReadiness: 80 })
  const diagnostics = buildReplayDiagnostics(replay, projection)
  assert.equal(diagnostics.confidence, 'partial')
})

test('diagnostics: knownSignals lists step count', () => {
  const feed = [makeEvent(), makeEvent()]
  const projection = makeProjection({ derivedFromEventCount: 2 })
  const replay = buildReplayEngine({ continuityFeed: feed, projection, focusResult: makeFocusResult(), currentReadiness: 80 })
  const diagnostics = buildReplayDiagnostics(replay, projection)
  assert.ok(diagnostics.knownSignals.some((s) => s.includes('2')))
})

test('diagnostics: unknownSignals notes empty timeline', () => {
  const projection = makeProjection({ derivedFromEventCount: 0 })
  const replay = buildReplayEngine({ continuityFeed: [], projection, focusResult: makeFocusResult(), currentReadiness: 80 })
  const diagnostics = buildReplayDiagnostics(replay, projection)
  assert.ok(diagnostics.unknownSignals.some((s) => s.toLowerCase().includes('timeline') || s.toLowerCase().includes('event')))
})

test('diagnostics: knownSignals identifies blocker steps', () => {
  const feed = [makeEvent({ blockedBy: 'approval' })]
  const projection = makeProjection({ derivedFromEventCount: 1 })
  const replay = buildReplayEngine({ continuityFeed: feed, projection, focusResult: makeFocusResult(), currentReadiness: 80 })
  const diagnostics = buildReplayDiagnostics(replay, projection)
  assert.ok(diagnostics.knownSignals.some((s) => s.toLowerCase().includes('blocker')))
})

test('diagnostics: knownSignals identifies resolution steps', () => {
  const feed = [makeEvent({ headline: 'Contract approved' })]
  const projection = makeProjection({ derivedFromEventCount: 1 })
  const replay = buildReplayEngine({ continuityFeed: feed, projection, focusResult: makeFocusResult(), currentReadiness: 80 })
  const diagnostics = buildReplayDiagnostics(replay, projection)
  assert.ok(diagnostics.knownSignals.some((s) => s.toLowerCase().includes('resolution')))
})

// ─── Integration ─────────────────────────────────────────────────────────────

test('integration: blockers highlighted in timeline', () => {
  const feed = [
    makeEvent({ id: 'ev:normal', headline: 'Status update', timestamp: '2026-05-30T08:00:00.000Z' }),
    makeEvent({ id: 'ev:blocker', headline: 'RF approval blocked', blockedBy: 'venue', timestamp: '2026-05-30T09:00:00.000Z' }),
    makeEvent({ id: 'ev:resolved', headline: 'RF approval confirmed', timestamp: '2026-05-30T10:00:00.000Z' }),
  ]
  const replay = buildReplayEngine({ continuityFeed: feed, projection: makeProjection(), focusResult: makeFocusResult(), currentReadiness: 75 })
  const blockerStep = replay.timeline.find((s) => s.id === 'ev:blocker')
  const resolvedStep = replay.timeline.find((s) => s.id === 'ev:resolved')
  assert.equal(blockerStep?.isBlocker, true)
  assert.equal(resolvedStep?.isResolution, true)
})

test('integration: focus events highlighted in timeline', () => {
  const feed = [
    makeEvent({ headline: 'Rider submitted to venue', timestamp: '2026-05-30T08:00:00.000Z' }),
    makeEvent({ headline: 'Generic team update', timestamp: '2026-05-30T09:00:00.000Z' }),
  ]
  const replay = buildReplayEngine({ continuityFeed: feed, projection: makeProjection(), focusResult: makeFocusResult(), currentReadiness: 80 })
  assert.equal(replay.timeline[0].isFocusRelated, true)
  assert.equal(replay.timeline[1].isFocusRelated, false)
})

test('integration: full replay shape matches expected output structure', () => {
  const item = makeFocusItem({ title: 'Hershey RF Approval', priorityScore: 92 })
  const feed = Array.from({ length: 5 }, (_, i) =>
    makeEvent({ id: `ev:${i}`, timestamp: `2026-05-${String(i + 1).padStart(2, '0')}T10:00:00.000Z` }),
  )
  const replay = buildReplayEngine({
    continuityFeed: feed,
    projection: makeProjection({ derivedFromEventCount: 5 }),
    focusResult: makeFocusResult(item),
    currentReadiness: 78,
  })
  assert.equal(replay.stepCount, 5)
  assert.equal(replay.currentReadiness, 78)
  assert.equal(replay.topFocus?.title, 'Hershey RF Approval')
  assert.equal(replay.timeline.length, 5)
  assert.ok(!Number.isNaN(Date.parse(replay.generatedAt)))
})
