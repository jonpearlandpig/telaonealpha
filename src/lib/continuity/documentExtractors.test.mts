import test from 'node:test'
import assert from 'node:assert/strict'

import { classifyDocument } from './documentClassifier'
import { extractPersonsFromAnchorDirectory } from './anchorDirectoryExtractor'
import { extractShowDatesFromCalendar } from './calendarExtractor'
import { extractDepartmentsFromRider } from './riderExtractor'

// ─── documentClassifier ──────────────────────────────────────────────────────

test('classifies anchor directory by filename', () => {
  assert.equal(classifyDocument('anchor-directory.pdf', ''), 'anchor-directory')
  assert.equal(classifyDocument('crew_list.docx', ''), 'anchor-directory')
  assert.equal(classifyDocument('Contact List.txt', ''), 'anchor-directory')
  assert.equal(classifyDocument('personnel.csv', ''), 'anchor-directory')
})

test('classifies tour calendar by filename', () => {
  assert.equal(classifyDocument('tour_calendar.pdf', ''), 'tour-calendar')
  assert.equal(classifyDocument('show-schedule.docx', ''), 'tour-calendar')
  assert.equal(classifyDocument('itinerary.txt', ''), 'tour-calendar')
})

test('classifies production rider by filename', () => {
  assert.equal(classifyDocument('production-rider.pdf', ''), 'production-rider')
  assert.equal(classifyDocument('hospitality-rider.docx', ''), 'production-rider')
  assert.equal(classifyDocument('advance-sheet.txt', ''), 'production-rider')
})

test('classifies by content when filename is ambiguous', () => {
  const anchorContent = 'Name | Role | Department\nJohn Smith | Tour Manager | Production\nPhone: 555-123-4567\nEmail: john@example.com'
  assert.equal(classifyDocument('upload.txt', anchorContent), 'anchor-directory')

  const calendarContent = 'March 15, 2025 | Madison Square Garden | New York, NY\nShowtime 8pm Doors 7pm\nApril 2 | United Center | Chicago, IL'
  assert.equal(classifyDocument('upload.txt', calendarContent), 'tour-calendar')

  const riderContent = 'Sound System requirements:\nFOH console: Avid SC48\nMonitor Engineer: Required\nPA System: Line Array'
  assert.equal(classifyDocument('upload.txt', riderContent), 'production-rider')
})

test('returns generic for unrecognized content', () => {
  assert.equal(classifyDocument('notes.txt', 'Some random meeting notes without any signals.'), 'generic')
})

// ─── anchorDirectoryExtractor ─────────────────────────────────────────────────

test('extracts persons from pipe-delimited contact list', () => {
  const content = [
    'Name | Role | Phone | Email',
    'Juan Otero | Production Manager | 555-123-4567 | juan@example.com',
    'Sarah Johnson | Tour Manager | 555-987-6543 | sarah@example.com',
    'Marcus Rivera | Stage Manager | 555-111-2222 | marcus@example.com',
  ].join('\n')

  const persons = extractPersonsFromAnchorDirectory(content)
  assert.equal(persons.length, 3)
  assert.ok(persons.some(p => p.name === 'Juan Otero'))
  assert.ok(persons.some(p => p.name === 'Sarah Johnson'))
  assert.ok(persons.some(p => p.name === 'Marcus Rivera'))
})

test('extracts persons from standalone name + contact lines', () => {
  const content = [
    'Juan Otero',
    'Cell: 555-123-4567',
    'juan@example.com',
    '',
    'Sarah Johnson',
    'Phone: 555-987-6543',
  ].join('\n')

  const persons = extractPersonsFromAnchorDirectory(content)
  assert.equal(persons.length, 2)
  assert.ok(persons.some(p => p.name === 'Juan Otero'))
  assert.ok(persons.some(p => p.name === 'Sarah Johnson'))
})

test('deduplicates persons', () => {
  const content = [
    'Juan Otero | Tour Manager | 555-111-2222',
    'Juan Otero | Tour Manager | 555-111-2222',
  ].join('\n')
  const persons = extractPersonsFromAnchorDirectory(content)
  assert.equal(persons.length, 1)
})

test('ignores stopword-only lines and header rows', () => {
  const content = [
    'Name | Role | Phone',
    'The Show | Production | 555-000-0000',
    'Juan Otero | Stage Manager | 555-123-4567',
  ].join('\n')
  const persons = extractPersonsFromAnchorDirectory(content)
  assert.equal(persons.length, 1)
  assert.equal(persons[0].name, 'Juan Otero')
})

// ─── calendarExtractor ────────────────────────────────────────────────────────

test('extracts show dates with month names', () => {
  const content = [
    'March 15, 2025 | Madison Square Garden | New York, NY',
    'April 2, 2025 | United Center | Chicago, IL',
  ].join('\n')

  const dates = extractShowDatesFromCalendar(content)
  assert.equal(dates.length, 2)
  assert.ok(dates[0].isoDate.startsWith('2025-03-15'))
  assert.equal(dates[0].venue, 'Madison Square Garden')
  assert.equal(dates[0].city, 'New York')
  assert.equal(dates[0].state, 'NY')
  assert.ok(dates[1].isoDate.startsWith('2025-04-02'))
})

test('extracts show dates with numeric format', () => {
  const content = '03/15/2025 - Staples Center - Los Angeles, CA\n04/02/2025 - United Center'
  const dates = extractShowDatesFromCalendar(content)
  assert.ok(dates.length >= 1)
  assert.ok(dates.some(d => d.isoDate.startsWith('2025-03-15')))
})

test('sorts extracted dates chronologically', () => {
  const content = [
    'June 1, 2025 | Venue B | City B',
    'March 15, 2025 | Venue A | City A',
    'September 20, 2025 | Venue C | City C',
  ].join('\n')
  const dates = extractShowDatesFromCalendar(content)
  assert.equal(dates.length, 3)
  assert.ok(dates[0].isoDate < dates[1].isoDate)
  assert.ok(dates[1].isoDate < dates[2].isoDate)
})

test('deduplicates identical dates', () => {
  const content = 'March 15, 2025 | Venue A\nMarch 15, 2025 | Venue B'
  const dates = extractShowDatesFromCalendar(content)
  assert.equal(dates.length, 1)
})

// ─── riderExtractor ───────────────────────────────────────────────────────────

test('extracts known departments from rider content', () => {
  const content = [
    'Sound System: L-Acoustics K2 line array. FOH console: Avid SC48.',
    'Lighting Rig: Full lighting design provided by act.',
    'Backline: Drum kit provided. Guitar tech required.',
    'Catering Rider: Hot meals for 12 at load-in.',
    'Security: 6 security staff required at floor.',
    'Tour Management: All logistics handled by tour manager.',
  ].join('\n')

  const departments = extractDepartmentsFromRider(content)
  assert.ok(departments.includes('Sound'))
  assert.ok(departments.includes('Lighting'))
  assert.ok(departments.includes('Backline'))
  assert.ok(departments.includes('Catering'))
  assert.ok(departments.includes('Security'))
  assert.ok(departments.includes('Tour Management'))
})

test('returns empty array when no departments detected', () => {
  const departments = extractDepartmentsFromRider('Some generic document text without any rider keywords.')
  assert.equal(departments.length, 0)
})

test('does not duplicate detected departments', () => {
  const content = 'Sound System: required. PA System: full L-Acoustics. FOH engineer provided.'
  const departments = extractDepartmentsFromRider(content)
  const soundCount = departments.filter(d => d === 'Sound').length
  assert.equal(soundCount, 1)
})
