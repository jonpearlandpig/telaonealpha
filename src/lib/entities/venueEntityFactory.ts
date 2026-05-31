// Deterministic venue entity and rider artifact creation from production rider content.
// NO LLM dependency. All extraction is regex-based.
// Returns null if no venue name can be extracted — caller must not block ingest on this.

import { deterministicArtifactId } from '@/lib/artifacts/artifactStore'
import { TRUST_RANK } from '@/lib/showtela/anchorDirectory'
import {
  SHOWTELA_RUNTIME_THREAD_ID,
  SHOWTELA_RUNTIME_ARTIFACT_GROUP_ID,
} from '@/lib/showtela/runtimeIds'
import type { EntityRecord } from '@/lib/entities/entityEngine'
import type { ArtifactRecord } from '@/lib/artifacts/artifactStore'

const SESSION_ID = 'showtela-rider-ingest'

// Ordered: more-specific patterns first
const VENUE_NAME_PATTERNS = [
  /^venue\s+name\s*[:\-]\s*(.+)/im,
  /^venue\s*[:\-]\s*(.+)/im,
  /^facility\s+name\s*[:\-]\s*(.+)/im,
  /^facility\s*[:\-]\s*(.+)/im,
  /^arena\s*[:\-]\s*(.+)/im,
  /^theater\s*[:\-]\s*(.+)/im,
  /^theatre\s*[:\-]\s*(.+)/im,
  /^hall\s*[:\-]\s*(.+)/im,
  /^presented\s+at\s*[:\-]\s*(.+)/im,
  /^location\s+name\s*[:\-]\s*(.+)/im,
]

const CITY_PATTERNS = [
  /^city\s*[:\-]\s*(.+)/im,
  /^show\s+city\s*[:\-]\s*(.+)/im,
]

const STATE_PATTERNS = [
  /^state\s*[:\-]\s*([A-Z]{2})\b/im,
  /^state\s*[:\-]\s*(.+)/im,
]

const LOAD_IN_PATTERNS = [
  /load[\s\-]?in\s+time\s*[:\-]\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/im,
  /load[\s\-]?in\s*[:\-]\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/im,
]

const LOAD_OUT_PATTERNS = [
  /load[\s\-]?out\s+time\s*[:\-]\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/im,
  /load[\s\-]?out\s*[:\-]\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/im,
  /hard\s+curfew\s*[:\-]\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/im,
  /curfew\s*[:\-]\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/im,
]

const CONTACT_PATTERNS = [
  /advance\s+contact\s*[:\-]\s*(.+)/im,
  /venue\s+contact\s*[:\-]\s*(.+)/im,
  /venue\s+production\s+manager\s*[:\-]\s*(.+)/im,
  /production\s+manager\s*[:\-]\s*(.+)/im,
  /venue\s+rep\s*[:\-]\s*(.+)/im,
]

function firstMatch(content: string, patterns: RegExp[]): string | undefined {
  for (const p of patterns) {
    const m = content.match(p)
    if (m?.[1]) return m[1].trim().replace(/\s+/g, ' ')
  }
  return undefined
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

function venueIdFromFilename(filename: string): string | undefined {
  const base = filename
    .replace(/\.(pdf|docx?|txt)$/i, '')
    .replace(/[-_]/g, ' ')
    .trim()
  if (base.length < 3) return undefined
  return `venue:${slugify(base)}`
}

export type VenueExtractionResult = {
  venueId: string
  venueName: string
  city?: string
  state?: string
  loadIn?: string
  loadOut?: string
  contact?: string
}

export function extractVenueFromRider(
  content: string,
  filename: string,
): VenueExtractionResult | null {
  const venueName = firstMatch(content, VENUE_NAME_PATTERNS)
  const city = firstMatch(content, CITY_PATTERNS)
  const state = firstMatch(content, STATE_PATTERNS)
  const loadIn = firstMatch(content, LOAD_IN_PATTERNS)
  const loadOut = firstMatch(content, LOAD_OUT_PATTERNS)
  const contact = firstMatch(content, CONTACT_PATTERNS)

  if (!venueName) {
    // Fallback: derive entity from filename only if it looks like a venue name
    const filenameId = venueIdFromFilename(filename)
    if (!filenameId) return null
    return {
      venueId: filenameId,
      venueName: filename.replace(/\.(pdf|docx?|txt)$/i, '').replace(/[-_]/g, ' ').trim(),
      city,
      state,
      loadIn,
      loadOut,
      contact,
    }
  }

  const venueId = city
    ? `venue:${slugify(city)}:${slugify(venueName)}`
    : `venue:${slugify(venueName)}`

  return { venueId, venueName, city, state, loadIn, loadOut, contact }
}

export function buildVenueEntity(
  extraction: VenueExtractionResult,
  artifactId: string,
  timestamp: string,
): EntityRecord {
  const aliases: string[] = []
  if (extraction.city) aliases.push(extraction.city)
  if (extraction.state) aliases.push(extraction.state)

  return {
    id: extraction.venueId,
    name: extraction.venueName,
    type: 'venue',
    aliases,
    firstSeen: timestamp,
    lastSeen: timestamp,
    linkedArtifacts: [artifactId],
    linkedThreads: [SHOWTELA_RUNTIME_THREAD_ID],
    operationalContexts: ['rider-venue'],
    continuityCount: 1,
    unresolvedLinks: 0,
    relatedArtifacts: [artifactId],
    relatedThreads: [SHOWTELA_RUNTIME_THREAD_ID],
    temporalClusters: [timestamp.slice(0, 10)],
    trustRank: TRUST_RANK['document'],
    authoritySource: 'document',
  }
}

export type RiderArtifactSpec = {
  extraction: VenueExtractionResult
  departments: string[]
  filename: string
  content: string
  timestamp: string
}

export function buildRiderArtifact(spec: RiderArtifactSpec): ArtifactRecord {
  const { extraction, departments, filename, content, timestamp } = spec

  const id = deterministicArtifactId({
    title: `rider-${extraction.venueId}-${timestamp.slice(0, 10)}`,
    threadId: SHOWTELA_RUNTIME_THREAD_ID,
    sessionId: SESSION_ID,
    createdAt: timestamp,
  })

  const previewText = content.slice(0, 500)

  const structure = JSON.stringify({
    documentType: 'production-rider',
    venueId: extraction.venueId,
    venueName: extraction.venueName,
    city: extraction.city,
    state: extraction.state,
    loadIn: extraction.loadIn,
    loadOut: extraction.loadOut,
    contact: extraction.contact,
    departments,
    extractedAt: timestamp,
  })

  const entities: string[] = [extraction.venueName]
  if (extraction.city) entities.push(extraction.city)

  return {
    id,
    title: `Rider — ${extraction.venueName}${extraction.city ? ` (${extraction.city})` : ''}`,
    threadId: SHOWTELA_RUNTIME_THREAD_ID,
    sessionId: SESSION_ID,
    text: previewText,
    fileName: filename,
    mimeType: 'application/pdf',
    artifactGroupId: SHOWTELA_RUNTIME_ARTIFACT_GROUP_ID,
    createdAt: timestamp,
    pinned: false,
    classification: 'runtime_artifact',
    entities,
    projects: [],
    structure,
  }
}
