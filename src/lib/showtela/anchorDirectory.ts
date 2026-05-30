import type { AuthoritySource, EntityType } from '@/lib/entities/entityEngine'

// Authority hierarchy for entity classification.
// Anchor Directory is the canonical source of person truth.
// Every other source is subordinate.
export const TRUST_RANK: Record<AuthoritySource, number> = {
  'anchor-directory': 1.0,
  'document': 0.8,
  'llm': 0.6,
  'regex': 0.4,
  'tentative': 0.2,
}

export type EntityClassification = {
  type: EntityType
  trustRank: number
  authoritySource: AuthoritySource
}

// Venue and physical-space indicators
const VENUE_PATTERN = /\b(venue|theater|theatre|arena|center|centre|stadium|hall|auditorium|pavilion|amphitheater|amphitheatre|ballroom|coliseum|colosseum|arena|gymnasium|gymnasium|sanctuary|chapel|cathedral)\b/i

// Major city / place names — extend as tour geography expands
const LOCATION_PATTERN = /\b(Austin|Nashville|New York|Los Angeles|San Francisco|London|Tokyo|Chicago|Atlanta|Dallas|Houston|Phoenix|Seattle|Denver|Boston|Hershey|Indianapolis|Portland|Minneapolis|Detroit|St\.?\s?Louis|Kansas City|San Diego|Las Vegas|Miami|Orlando|Charlotte|Raleigh|Pittsburgh|Columbus|Cleveland|Cincinnati|Milwaukee|Memphis|New Orleans|Salt Lake|Sacramento|Tampa|Baltimore|Richmond|Norfolk|Omaha|Tulsa|Oklahoma|Albuquerque|Tucson|Jacksonville|Tallahassee|Gainesville|Pensacola|Baton Rouge|Shreveport|Chattanooga|Knoxville|Greenville|Columbia|Charleston|Savannah)\b/i

// Operation and touring-production indicators
const OPERATION_PATTERN = /\b(crusade|tour|production|campaign|series|circuit|festival|roadshow|residency|show|event|concert)\b/i

// Project and platform indicators
const PROJECT_PATTERN = /\b(flightpath|tourtext|teladex|project|initiative|program|platform)\b/i

// Calendar and scheduling indicators — always operations, never people
const CALENDAR_PATTERN = /\b(calendar|schedule|itinerary|call sheet|call-sheet|rundown|timeline|advance)\b/i

// Priority check order: venue → location → calendar → operation → project → tentative
// Owner fields (event.owner) are always person at document authority — never go through this function.
// Operation dropdown values are always operation at document authority — never go through this function.
export function classifyLinkedEntity(name: string): EntityClassification {
  const n = name.trim()

  if (VENUE_PATTERN.test(n)) {
    return { type: 'location', trustRank: TRUST_RANK['regex'], authoritySource: 'regex' }
  }
  if (LOCATION_PATTERN.test(n)) {
    return { type: 'location', trustRank: TRUST_RANK['regex'], authoritySource: 'regex' }
  }
  if (CALENDAR_PATTERN.test(n)) {
    return { type: 'operation', trustRank: TRUST_RANK['regex'], authoritySource: 'regex' }
  }
  if (OPERATION_PATTERN.test(n)) {
    return { type: 'operation', trustRank: TRUST_RANK['regex'], authoritySource: 'regex' }
  }
  if (PROJECT_PATTERN.test(n)) {
    return { type: 'project', trustRank: TRUST_RANK['regex'], authoritySource: 'regex' }
  }

  // Fallback: tentative context — NOT person.
  // Person classification is reserved for anchor-directory and document (owner field) sources.
  return { type: 'context', trustRank: TRUST_RANK['tentative'], authoritySource: 'tentative' }
}

// Migration: determines whether a stored entity is contaminated (wrong type due to old binary logic).
// Only reclassifies when the detected type is a definitive non-person (location/operation/project).
// Ambiguous names remain as-is — they are not force-corrected.
export function detectContaminatedType(storedType: string, name: string): EntityClassification | null {
  if (storedType !== 'person') return null
  const detected = classifyLinkedEntity(name)
  if (detected.type === 'location' || detected.type === 'operation' || detected.type === 'project') {
    return detected
  }
  return null
}
