import test from 'node:test'
import assert from 'node:assert/strict'

import {
  extractOperationalEvents,
  calculateOperationalReadiness,
  buildOperationalMovement,
} from './operationalExtraction.js'
import type { OperationalEvent } from './operationalExtraction.js'
import type { ContinuityEvent } from '@/lib/showtela/types'

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeShowDateEvent(overrides: Partial<ContinuityEvent> = {}): ContinuityEvent {
  return {
    id: 'artifact-show-001',
    headline: 'Show — Madison Square Garden, New York',
    timestamp: '2026-06-15T20:00:00.000Z',
    continuityObject: {
      id: 'ocid-show-001',
      kind: 'show-date',
      title: 'Show — Madison Square Garden, New York',
      summary: 'Madison Square Garden, New York',
      capturedAt: '2026-06-15T20:00:00.000Z',
      provenance: {
        what: 'Show date extracted from tour calendar',
        when: '2026-06-15T20:00:00.000Z',
        linkedEntity: 'Madison Square Garden',
      },
      source: { mode: 'upload-files', assetNames: ['tour-calendar.pdf'] },
    },
    tags: ['SHOW', 'CALENDAR'],
    ...overrides,
  }
}

function makeThreadEvent(): ContinuityEvent {
  return {
    id: 'artifact-thread-001',
    headline: 'Thread continuity active',
    timestamp: '2026-05-30T10:00:00.000Z',
    continuityObject: {
      id: 'thread:abc-def',
      kind: 'continuity-thread',
      title: 'thread:abc-def',
      summary: 'Active thread',
      capturedAt: '2026-05-30T10:00:00.000Z',
      provenance: { what: 'Thread continuity', when: '2026-05-30T10:00:00.000Z' },
      source: { mode: 'quick-update' },
    },
  }
}

function makeAnchorDirectoryEvent(): ContinuityEvent {
  return {
    id: 'artifact-anchor-001',
    headline: 'Anchor Directory — 5 crew members activated',
    timestamp: '2026-05-30T10:00:00.000Z',
    continuityObject: {
      id: 'ocid-anchor-001',
      kind: 'anchor-directory-summary',
      title: 'Anchor Directory — 5 crew members activated',
      summary: 'Crew: Juan Otero, Sarah Johnson, Marcus Rivera',
      capturedAt: '2026-05-30T10:00:00.000Z',
      provenance: { what: 'Anchor directory ingested', when: '2026-05-30T10:00:00.000Z' },
      source: { mode: 'upload-files', assetNames: ['crew-list.pdf'] },
    },
  }
}

function makeGovernanceEvent(): ContinuityEvent {
  return {
    id: 'artifact-gov-001',
    headline: 'Governance blocked',
    timestamp: '2026-05-30T10:00:00.000Z',
    continuityObject: {
      id: 'governance:lineage-abc',
      kind: 'governance',
      title: 'governance:lineage-abc',
      summary: 'Governance record',
      capturedAt: '2026-05-30T10:00:00.000Z',
      provenance: { what: 'Governance event', when: '2026-05-30T10:00:00.000Z' },
      source: { mode: 'quick-update' },
    },
  }
}

// ─── extractOperationalEvents ─────────────────────────────────────────────────

test('extracts show_day events from show-date continuity objects', () => {
  const events = extractOperationalEvents([makeShowDateEvent()])
  assert.equal(events.length, 1)
  assert.equal(events[0]?.kind, 'show_day')
  assert.equal(events[0]?.title, 'Show — Madison Square Garden, New York')
  assert.equal(events[0]?.isoDate, '2026-06-15T20:00:00.000Z')
  assert.equal(events[0]?.venue, 'Madison Square Garden')
  assert.equal(events[0]?.sourceContinuityKind, 'show-date')
})

test('rejects continuity-thread objects — never appears in operational events', () => {
  const events = extractOperationalEvents([makeThreadEvent()])
  assert.equal(events.length, 0)
})

test('rejects governance objects — infrastructure never surfaces as operational events', () => {
  const events = extractOperationalEvents([makeGovernanceEvent()])
  assert.equal(events.length, 0)
})

test('rejects objects with no valid date', () => {
  const ev = makeShowDateEvent()
  ev.continuityObject!.capturedAt = undefined as unknown as string
  ev.timestamp = undefined
  const events = extractOperationalEvents([ev])
  assert.equal(events.length, 0)
})

test('rejects anchor-directory summary — only extracts real operational events', () => {
  const events = extractOperationalEvents([makeAnchorDirectoryEvent()])
  assert.equal(events.length, 0)
})

test('anchor directory upload: crew entities appear, no operational events', () => {
  // Simulates: anchor directory uploaded → continuityFeed has crew activation record
  const feed: ContinuityEvent[] = [makeAnchorDirectoryEvent(), makeThreadEvent()]
  const events = extractOperationalEvents(feed)
  assert.equal(events.length, 0, 'no operational events from anchor directory or thread records')
})

test('tour calendar upload: show dates appear as show_day events', () => {
  const feed: ContinuityEvent[] = [
    makeShowDateEvent(),
    makeShowDateEvent({
      id: 'artifact-show-002',
      headline: 'Show — United Center, Chicago',
      timestamp: '2026-07-10T20:00:00.000Z',
      continuityObject: {
        id: 'ocid-show-002',
        kind: 'show-date',
        title: 'Show — United Center, Chicago',
        summary: 'United Center, Chicago',
        capturedAt: '2026-07-10T20:00:00.000Z',
        provenance: {
          what: 'Show date extracted from tour calendar',
          when: '2026-07-10T20:00:00.000Z',
          linkedEntity: 'United Center',
        },
        source: { mode: 'upload-files', assetNames: ['tour-calendar.pdf'] },
      },
    }),
  ]

  const events = extractOperationalEvents(feed)
  assert.equal(events.length, 2)
  assert.equal(events[0]?.kind, 'show_day')
  assert.equal(events[1]?.kind, 'show_day')
  // Sorted chronologically
  assert.ok(events[0]!.isoDate < events[1]!.isoDate)
})

test('mixed feed: extracts only operational events, ignores thread/governance', () => {
  const feed: ContinuityEvent[] = [
    makeShowDateEvent(),
    makeThreadEvent(),
    makeGovernanceEvent(),
    makeAnchorDirectoryEvent(),
  ]
  const events = extractOperationalEvents(feed)
  assert.equal(events.length, 1)
  assert.equal(events[0]?.kind, 'show_day')
})

test('deduplication: two identical show dates produce two events (dedup by id, not date)', () => {
  const ev1 = makeShowDateEvent()
  const ev2 = makeShowDateEvent({ id: 'artifact-show-002' })
  const events = extractOperationalEvents([ev1, ev2])
  assert.equal(events.length, 2)
})

test('classifies travel_day from title keywords', () => {
  const feed: ContinuityEvent[] = [{
    id: 'travel-001',
    headline: 'Travel day to New York',
    timestamp: '2026-06-14T08:00:00.000Z',
    continuityObject: {
      id: 'ocid-travel-001',
      kind: 'production-event',
      title: 'Travel day to New York',
      summary: 'Flight NYC',
      capturedAt: '2026-06-14T08:00:00.000Z',
      provenance: { what: 'Travel', when: '2026-06-14T08:00:00.000Z' },
      source: { mode: 'quick-update' },
    },
  }]
  const events = extractOperationalEvents(feed)
  assert.equal(events.length, 1)
  assert.equal(events[0]?.kind, 'travel_day')
})

test('classifies rehearsal from title keywords', () => {
  const feed: ContinuityEvent[] = [{
    id: 'rehearsal-001',
    headline: 'Full band rehearsal',
    timestamp: '2026-06-13T14:00:00.000Z',
    continuityObject: {
      id: 'ocid-rehearsal-001',
      kind: 'production-event',
      title: 'Full band rehearsal',
      summary: 'Soundcheck and full rehearsal',
      capturedAt: '2026-06-13T14:00:00.000Z',
      provenance: { what: 'Rehearsal', when: '2026-06-13T14:00:00.000Z' },
      source: { mode: 'quick-update' },
    },
  }]
  const events = extractOperationalEvents(feed)
  assert.equal(events.length, 1)
  assert.equal(events[0]?.kind, 'rehearsal')
})

// ─── calculateOperationalReadiness ──────────────────────────────────────────

test('readiness is none when no operational events exist', () => {
  const result = calculateOperationalReadiness({
    operationalEvents: [],
    crewCount: 0,
    blockersCount: 0,
  })
  assert.equal(result.score, 0)
  assert.equal(result.level, 'none')
  assert.equal(result.hasUpcomingShows, false)
})

test('readiness score increases with shows and crew', () => {
  const futureDate = new Date(Date.now() + 7 * 86_400_000).toISOString()
  const events: OperationalEvent[] = [{
    id: 'op:show-001',
    kind: 'show_day',
    title: 'Show — MSG',
    isoDate: futureDate,
    sourceArtifactId: 'art-001',
    sourceContinuityKind: 'show-date',
  }]

  const result = calculateOperationalReadiness({
    operationalEvents: events,
    crewCount: 5,
    blockersCount: 0,
  })
  assert.ok(result.score >= 60, `expected score >= 60, got ${result.score}`)
  assert.equal(result.hasUpcomingShows, true)
  assert.equal(result.level, 'ready')
})

test('readiness is capped at 100 and minimum 0', () => {
  const events: OperationalEvent[] = []
  const worst = calculateOperationalReadiness({ operationalEvents: events, crewCount: 0, blockersCount: 100 })
  assert.equal(worst.score, 0)

  const futureDate = new Date(Date.now() + 7 * 86_400_000).toISOString()
  const best: OperationalEvent[] = [
    { id: 'op:show', kind: 'show_day', title: 'Show', isoDate: futureDate, sourceArtifactId: 'a', sourceContinuityKind: 'show-date' },
    { id: 'op:rehearsal', kind: 'rehearsal', title: 'Rehearsal', isoDate: futureDate, sourceArtifactId: 'b', sourceContinuityKind: 'production-event' },
    { id: 'op:advance', kind: 'venue_advance', title: 'Advance', isoDate: futureDate, sourceArtifactId: 'c', sourceContinuityKind: 'production-event' },
  ]
  const bestResult = calculateOperationalReadiness({ operationalEvents: best, crewCount: 10, blockersCount: 0 })
  assert.ok(bestResult.score <= 100)
})

test('infrastructure events do not affect readiness (no continuity-thread, governance in input)', () => {
  // This test verifies the design contract: extractOperationalEvents is called upstream
  // and produces ZERO events from thread/governance kinds. If we accidentally pass
  // thread objects to calculateOperationalReadiness, they would simply not match
  // any kind ('show_day', 'rehearsal', etc.) so the score stays at the crew baseline.
  const nonOperationalEvents: OperationalEvent[] = []
  const result = calculateOperationalReadiness({ operationalEvents: nonOperationalEvents, crewCount: 3, blockersCount: 0 })
  assert.equal(result.hasUpcomingShows, false)
  assert.equal(result.hasRehearsals, false)
  // crew adds 20 but no shows/rehearsals
  assert.equal(result.score, 20)
})

// ─── buildOperationalMovement ────────────────────────────────────────────────

test('builds movement from upcoming events sorted by proximity', () => {
  const base = new Date('2026-06-01T00:00:00.000Z')
  const events: OperationalEvent[] = [
    { id: 'op:show-b', kind: 'show_day', title: 'Show B', isoDate: '2026-06-20T20:00:00.000Z', sourceArtifactId: 'b', sourceContinuityKind: 'show-date' },
    { id: 'op:show-a', kind: 'show_day', title: 'Show A', isoDate: '2026-06-10T20:00:00.000Z', sourceArtifactId: 'a', sourceContinuityKind: 'show-date' },
    { id: 'op:rehearsal', kind: 'rehearsal', title: 'Rehearsal', isoDate: '2026-06-08T14:00:00.000Z', sourceArtifactId: 'c', sourceContinuityKind: 'production-event' },
    { id: 'op:travel', kind: 'travel_day', title: 'Travel', isoDate: '2026-06-09T08:00:00.000Z', sourceArtifactId: 'd', sourceContinuityKind: 'production-event' },
  ]

  const movement = buildOperationalMovement({ operationalEvents: events, baseDate: base })
  assert.equal(movement.length, 3)
  assert.equal(movement[0]?.id, 'op:rehearsal')
  assert.equal(movement[1]?.id, 'op:travel')
  assert.equal(movement[2]?.id, 'op:show-a')
})

test('movement excludes past events', () => {
  const base = new Date('2026-06-01T00:00:00.000Z')
  const events: OperationalEvent[] = [
    { id: 'op:past', kind: 'show_day', title: 'Past Show', isoDate: '2026-05-15T20:00:00.000Z', sourceArtifactId: 'a', sourceContinuityKind: 'show-date' },
    { id: 'op:future', kind: 'show_day', title: 'Future Show', isoDate: '2026-06-15T20:00:00.000Z', sourceArtifactId: 'b', sourceContinuityKind: 'show-date' },
  ]
  const movement = buildOperationalMovement({ operationalEvents: events, baseDate: base })
  assert.equal(movement.length, 1)
  assert.equal(movement[0]?.id, 'op:future')
})

test('movement is capped at 3 items', () => {
  const base = new Date('2026-01-01T00:00:00.000Z')
  const events: OperationalEvent[] = Array.from({ length: 10 }, (_, i) => ({
    id: `op:show-${i}`,
    kind: 'show_day' as const,
    title: `Show ${i}`,
    isoDate: `2026-0${(i % 9) + 1}-${String(i + 1).padStart(2, '0')}T20:00:00.000Z`,
    sourceArtifactId: `art-${i}`,
    sourceContinuityKind: 'show-date',
  }))

  const movement = buildOperationalMovement({ operationalEvents: events, baseDate: base })
  assert.ok(movement.length <= 3)
})

test('movement is empty when no operational events exist', () => {
  const movement = buildOperationalMovement({ operationalEvents: [] })
  assert.equal(movement.length, 0)
})

// ─── First-run validation scenarios ──────────────────────────────────────────

test('first-run: anchor directory only — no operation events, no calendar entries', () => {
  // Scenario: User creates ShowTELA and uploads only an anchor directory
  // Expected: crew entities appear, but zero operational events (no shows, no calendar)
  const feed: ContinuityEvent[] = [makeAnchorDirectoryEvent()]
  const events = extractOperationalEvents(feed)

  assert.equal(events.length, 0, 'no operational events from anchor directory alone')

  const readiness = calculateOperationalReadiness({ operationalEvents: events, crewCount: 5, blockersCount: 0 })
  assert.equal(readiness.hasUpcomingShows, false)
  assert.equal(readiness.hasRehearsals, false)
  assert.equal(readiness.hasVenueAdvances, false)
  // score is 20 (crew only) — no shows/rehearsals
  assert.equal(readiness.score, 20)

  const movement = buildOperationalMovement({ operationalEvents: events })
  assert.equal(movement.length, 0, 'no movement cards without show dates')
})

test('first-run: tour calendar — real show dates populate calendar and movement', () => {
  // Scenario: User uploads a tour calendar after the anchor directory
  // Expected: real show dates appear, calendar populated, readiness generated
  const feed: ContinuityEvent[] = [
    makeShowDateEvent(),
    makeShowDateEvent({
      id: 'artifact-show-002',
      headline: 'Show — United Center, Chicago',
      timestamp: '2026-07-10T20:00:00.000Z',
      continuityObject: {
        id: 'ocid-show-002',
        kind: 'show-date',
        title: 'Show — United Center, Chicago',
        summary: 'United Center, Chicago',
        capturedAt: '2026-07-10T20:00:00.000Z',
        provenance: { what: 'Show date', when: '2026-07-10T20:00:00.000Z', linkedEntity: 'United Center' },
        source: { mode: 'upload-files', assetNames: ['tour-calendar.pdf'] },
      },
    }),
    makeAnchorDirectoryEvent(),  // also present — should not generate ops events
  ]

  const events = extractOperationalEvents(feed)
  assert.equal(events.length, 2, 'only show-date objects produce operational events')
  assert.ok(events.every(e => e.kind === 'show_day'), 'all events are show_day')

  const base = new Date('2026-05-30T00:00:00.000Z')
  const readiness = calculateOperationalReadiness({ operationalEvents: events, crewCount: 5, blockersCount: 0, baseDate: base })
  assert.equal(readiness.hasUpcomingShows, true)
  assert.ok(readiness.score >= 60)

  const movement = buildOperationalMovement({ operationalEvents: events, baseDate: base })
  assert.ok(movement.length > 0, 'movement cards populated from show dates')
  assert.equal(movement[0]?.kind, 'show_day')
})

test('no UUID or thread IDs appear in operational event titles', () => {
  const feed: ContinuityEvent[] = [
    makeShowDateEvent(),
    makeThreadEvent(),
  ]
  const events = extractOperationalEvents(feed)
  for (const ev of events) {
    assert.ok(!ev.title.includes('thread:'), `title must not contain thread: prefix, got: ${ev.title}`)
    assert.ok(!/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(ev.title), `title must not contain UUID, got: ${ev.title}`)
    assert.ok(!ev.title.includes('decision:'), `title must not contain decision: prefix, got: ${ev.title}`)
    assert.ok(!ev.title.includes('operator.'), `title must not contain operator. prefix, got: ${ev.title}`)
  }
})
