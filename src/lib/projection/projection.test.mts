import assert from 'node:assert/strict'
import test from 'node:test'
import type { ShowTelaHomeData } from '@/lib/showtela/types'
import {
  buildOperationalProjection,
  buildProjectionBlockers,
  calculateOpenPressure,
  calculateReadiness,
  detectCallSheetIssued,
  detectRiderAccepted,
  detectRosterLocked,
  findNextShow,
} from './projectionBuilder'

// ─── fixtures ────────────────────────────────────────────────────────────────

function emptyHome(overrides?: Partial<ShowTelaHomeData>): ShowTelaHomeData {
  return {
    activeOps: [],
    fluencyPartners: [],
    operations: [],
    unresolved: [],
    continuityFeed: [],
    pressureSummary: { total: 0, high: 0, medium: 0 },
    runtimeTimeline: [],
    ...overrides,
  }
}

// ─── readiness ────────────────────────────────────────────────────────────────

test('calculateReadiness: empty signals gives 25 (3 missing × −25, no critical blocker)', () => {
  assert.equal(calculateReadiness(false, false, false, []), 25)
})

test('calculateReadiness: all signals present gives 100', () => {
  assert.equal(calculateReadiness(true, true, true, []), 100)
})

test('calculateReadiness: one missing signal gives 75', () => {
  assert.equal(calculateReadiness(false, true, true, []), 75)
})

test('calculateReadiness: critical blocker subtracts 25', () => {
  assert.equal(
    calculateReadiness(true, true, true, [{ id: 'b1', title: 'LX signoff', severity: 'critical' }]),
    75,
  )
})

test('calculateReadiness: all missing + critical blocker clamps to 0', () => {
  assert.equal(
    calculateReadiness(false, false, false, [{ id: 'b1', title: 'LX signoff', severity: 'critical' }]),
    0,
  )
})

test('calculateReadiness: high/medium blockers do not subtract from readiness', () => {
  const blockers = [
    { id: 'b1', title: 'High item', severity: 'high' as const },
    { id: 'b2', title: 'Medium item', severity: 'medium' as const },
  ]
  assert.equal(calculateReadiness(true, true, true, blockers), 100)
})

// ─── pressure ────────────────────────────────────────────────────────────────

test('calculateOpenPressure: empty blockers gives 0', () => {
  assert.equal(calculateOpenPressure([]), 0)
})

test('calculateOpenPressure: critical +10, high +5, medium +2, low +1', () => {
  const blockers = [
    { id: 'b1', title: 'A', severity: 'critical' as const },
    { id: 'b2', title: 'B', severity: 'high' as const },
    { id: 'b3', title: 'C', severity: 'medium' as const },
    { id: 'b4', title: 'D', severity: 'low' as const },
  ]
  assert.equal(calculateOpenPressure(blockers), 18)
})

test('calculateOpenPressure: two critical blockers gives 20', () => {
  const blockers = [
    { id: 'b1', title: 'A', severity: 'critical' as const },
    { id: 'b2', title: 'B', severity: 'critical' as const },
  ]
  assert.equal(calculateOpenPressure(blockers), 20)
})

// ─── blocker construction ─────────────────────────────────────────────────────

test('buildProjectionBlockers: empty home produces no blockers', () => {
  assert.deepEqual(buildProjectionBlockers(emptyHome()), [])
})

test('buildProjectionBlockers: blocking unresolved item becomes critical blocker', () => {
  const home = emptyHome({
    unresolved: [{ id: 'u1', title: 'LX trim signoff', severity: 'high', blocking: true }],
  })
  const blockers = buildProjectionBlockers(home)
  assert.equal(blockers.length, 1)
  assert.equal(blockers[0].severity, 'critical')
  assert.equal(blockers[0].title, 'LX trim signoff')
})

test('buildProjectionBlockers: severity maps from unresolved pressure level', () => {
  const home = emptyHome({
    unresolved: [
      { id: 'u1', title: 'Critical item', severity: 'critical' },
      { id: 'u2', title: 'High item', severity: 'high' },
      { id: 'u3', title: 'Medium item', severity: 'medium' },
      { id: 'u4', title: 'Low item', severity: 'low' },
    ],
  })
  const blockers = buildProjectionBlockers(home)
  assert.equal(blockers.length, 4)
  assert.equal(blockers[0].severity, 'critical')
  assert.equal(blockers[1].severity, 'high')
  assert.equal(blockers[2].severity, 'medium')
  assert.equal(blockers[3].severity, 'low')
})

test('buildProjectionBlockers: sourceArtifact comes from unresolved.operation', () => {
  const home = emptyHome({
    unresolved: [{ id: 'u1', title: 'Pending item', severity: 'medium', operation: 'Spring Tour' }],
  })
  const [blocker] = buildProjectionBlockers(home)
  assert.equal(blocker.sourceArtifact, 'Spring Tour')
})

test('buildProjectionBlockers: deduplicates same title from unresolved and feed', () => {
  const home = emptyHome({
    unresolved: [{ id: 'u1', title: 'LX signoff', severity: 'high', blocking: true }],
    continuityFeed: [
      {
        id: 'f1',
        headline: 'LX signoff',
        pressure: 'critical',
        blockedBy: 'Fred Mann',
        timestamp: new Date().toISOString(),
        tags: [],
      },
    ],
  })
  const blockers = buildProjectionBlockers(home)
  assert.equal(blockers.length, 1)
})

test('buildProjectionBlockers: resolves ownerId from matching feed event', () => {
  const home = emptyHome({
    unresolved: [{ id: 'u1', title: 'LX trim signoff', severity: 'high' }],
    activeOps: [{ id: 'person-fred', name: 'Fred Mann' }],
    continuityFeed: [
      {
        id: 'f1',
        headline: 'LX trim signoff is waiting on Fred',
        owner: { id: 'person-fred', name: 'Fred Mann' },
        timestamp: new Date().toISOString(),
        tags: [],
      },
    ],
  })
  const [blocker] = buildProjectionBlockers(home)
  assert.equal(blocker.ownerId, 'person-fred')
})

// ─── signal detection ─────────────────────────────────────────────────────────

test('detectRiderAccepted: false when no feed events', () => {
  assert.equal(detectRiderAccepted(emptyHome()), false)
})

test('detectRiderAccepted: false when rider in feed but no acceptance language', () => {
  const home = emptyHome({
    continuityFeed: [
      {
        id: 'f1',
        headline: 'Production rider sent to venue',
        timestamp: new Date().toISOString(),
        tags: [],
      },
    ],
  })
  assert.equal(detectRiderAccepted(home), false)
})

test('detectRiderAccepted: true when rider confirmed in feed with no blockers', () => {
  const home = emptyHome({
    continuityFeed: [
      {
        id: 'f1',
        headline: 'Production rider confirmed by venue',
        timestamp: new Date().toISOString(),
        tags: [],
      },
    ],
  })
  assert.equal(detectRiderAccepted(home), true)
})

test('detectRiderAccepted: false when rider confirmed but blocking unresolved exists', () => {
  const home = emptyHome({
    continuityFeed: [
      {
        id: 'f1',
        headline: 'Technical rider confirmed',
        timestamp: new Date().toISOString(),
        tags: [],
      },
    ],
    unresolved: [{ id: 'u1', title: 'Rider line item still open', severity: 'high', blocking: true }],
  })
  assert.equal(detectRiderAccepted(home), false)
})

test('detectCallSheetIssued: false when no call sheet data', () => {
  assert.equal(detectCallSheetIssued(emptyHome()), false)
})

test('detectCallSheetIssued: true when call sheet present in feed', () => {
  const home = emptyHome({
    continuityFeed: [
      {
        id: 'f1',
        headline: 'Call sheet issued for Feb 15',
        timestamp: new Date().toISOString(),
        tags: [],
      },
    ],
  })
  assert.equal(detectCallSheetIssued(home), true)
})

test('detectCallSheetIssued: true when call sheet found in operations', () => {
  const home = emptyHome({
    operations: [{ id: 'op1', title: 'Call Sheet — Spring 2027', unresolvedCount: 0 }],
  })
  assert.equal(detectCallSheetIssued(home), true)
})

test('detectCallSheetIssued: false when call sheet in feed but blocking unresolved', () => {
  const home = emptyHome({
    continuityFeed: [
      {
        id: 'f1',
        headline: 'Call sheet drafted',
        timestamp: new Date().toISOString(),
        tags: [],
      },
    ],
    unresolved: [{ id: 'u1', title: 'Call sheet needs department heads to confirm', severity: 'critical' }],
  })
  assert.equal(detectCallSheetIssued(home), false)
})

test('detectRosterLocked: false when no roster data', () => {
  assert.equal(detectRosterLocked(emptyHome()), false)
})

test('detectRosterLocked: true when roster locked signal in feed', () => {
  const home = emptyHome({
    continuityFeed: [
      {
        id: 'f1',
        headline: 'Crew roster locked for Spring 2027',
        timestamp: new Date().toISOString(),
        tags: [],
      },
    ],
  })
  assert.equal(detectRosterLocked(home), true)
})

test('detectRosterLocked: false when roster mentioned but no lock signal', () => {
  const home = emptyHome({
    continuityFeed: [
      {
        id: 'f1',
        headline: 'Roster review in progress',
        timestamp: new Date().toISOString(),
        tags: [],
      },
    ],
  })
  assert.equal(detectRosterLocked(home), false)
})

// ─── show detection ───────────────────────────────────────────────────────────

test('findNextShow: returns undefined when no show data', () => {
  assert.equal(findNextShow(emptyHome()), undefined)
})

test('findNextShow: detects show from operation with show keyword', () => {
  const home = emptyHome({
    operations: [{ id: 'op-spring-tour', title: 'Spring 2027 Arena Tour', unresolvedCount: 0 }],
  })
  const show = findNextShow(home, new Date('2027-01-01'))
  assert.ok(show != null)
  assert.equal(show!.showId, 'op-spring-tour')
})

test('findNextShow: extracts venue word from operation title', () => {
  const home = emptyHome({
    operations: [
      {
        id: 'op1',
        title: 'Bridgestone Arena show',
        unresolvedCount: 0,
      },
    ],
  })
  const show = findNextShow(home, new Date('2027-01-01'))
  assert.ok(show != null)
  assert.ok(show!.venue.toLowerCase().includes('arena'))
})

test('findNextShow: parses future date from operation status', () => {
  const home = emptyHome({
    operations: [
      {
        id: 'op1',
        title: 'Spring Arena Tour',
        status: 'Show confirmed for Feb 15, 2028',
        unresolvedCount: 0,
      },
    ],
  })
  const base = new Date('2027-01-01')
  const show = findNextShow(home, base)
  assert.ok(show != null)
  assert.equal(show!.date, '2028-02-15')
  assert.ok(show!.daysUntilShow > 0)
})

test('findNextShow: date unknown when no parsable future date found', () => {
  const home = emptyHome({
    operations: [{ id: 'op1', title: 'Summer Concert', unresolvedCount: 0 }],
  })
  const show = findNextShow(home, new Date('2030-01-01'))
  assert.ok(show != null)
  assert.equal(show!.date, 'unknown')
  assert.equal(show!.daysUntilShow, -1)
})

// ─── full projection ──────────────────────────────────────────────────────────

test('buildOperationalProjection: empty home gives readiness 25 and pressure 0', () => {
  const proj = buildOperationalProjection(emptyHome())
  assert.equal(proj.readinessScore, 25)
  assert.equal(proj.openPressure, 0)
  assert.deepEqual(proj.activeBlockers, [])
  assert.equal(proj.nextShow, undefined)
})

test('buildOperationalProjection: critical blocker drives nextMeaningfulMovement to assign owner', () => {
  const home = emptyHome({
    unresolved: [{ id: 'u1', title: 'LX trim signoff', severity: 'critical', blocking: true }],
  })
  const proj = buildOperationalProjection(home)
  assert.ok(proj.nextMeaningfulMovement?.toLowerCase().includes('lx trim signoff'))
})

test('buildOperationalProjection: with rider confirmed nextMeaningfulMovement skips rider step', () => {
  const home = emptyHome({
    continuityFeed: [
      {
        id: 'f1',
        headline: 'Production rider confirmed by venue',
        timestamp: new Date().toISOString(),
        tags: [],
      },
    ],
  })
  const proj = buildOperationalProjection(home)
  assert.ok(!proj.nextMeaningfulMovement?.toLowerCase().includes('rider'))
})

test('buildOperationalProjection: no blockers gives no-blocker movement message', () => {
  const home = emptyHome({
    continuityFeed: [
      {
        id: 'f1',
        headline: 'Production rider confirmed by venue',
        timestamp: new Date().toISOString(),
        tags: [],
      },
      {
        id: 'f2',
        headline: 'Call sheet issued for all departments',
        timestamp: new Date().toISOString(),
        tags: [],
      },
      {
        id: 'f3',
        headline: 'Crew roster locked confirmed',
        timestamp: new Date().toISOString(),
        tags: [],
      },
    ],
  })
  const proj = buildOperationalProjection(home)
  assert.equal(proj.openPressure, 0)
  assert.equal(proj.nextMeaningfulMovement, 'No active blockers — hold current plan')
})

test('buildOperationalProjection: pressure owner resolution surfaces name', () => {
  const home = emptyHome({
    activeOps: [{ id: 'person-sam', name: 'Sam Rivers', pressure: 'critical' }],
    unresolved: [{ id: 'u1', title: 'Bus schedule missing', severity: 'critical', blocking: true }],
    continuityFeed: [
      {
        id: 'f1',
        headline: 'Bus schedule missing is waiting on Sam',
        owner: { id: 'person-sam', name: 'Sam Rivers' },
        timestamp: new Date().toISOString(),
        tags: [],
      },
    ],
  })
  const proj = buildOperationalProjection(home)
  assert.ok(proj.nextMeaningfulMovement?.includes('Sam Rivers'))
})
