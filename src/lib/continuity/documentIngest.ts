import { classifyDocument } from './documentClassifier'
import { extractPersonsFromAnchorDirectory } from './anchorDirectoryExtractor'
import { extractShowDatesFromCalendar } from './calendarExtractor'
import { extractDepartmentsFromRider } from './riderExtractor'
import { ingestCanonicalContinuity } from './ingest-runtime'
import { persistDurableContinuity } from '@/lib/runtime/durableMemory'
import { deterministicArtifactId } from '@/lib/artifacts/artifactStore'
import { TRUST_RANK } from '@/lib/showtela/anchorDirectory'
import {
  SHOWTELA_WORKSPACE_ID,
  SHOWTELA_RUNTIME_THREAD_ID,
  SHOWTELA_RUNTIME_ARTIFACT_GROUP_ID,
} from '@/lib/showtela/runtimeIds'
import { createContinuityOcid } from '@/lib/showtela/continuityRecord'
import type { ContinuityIngestionInput } from './normalize-ingestion'
import type { EntityRecord } from '@/lib/entities/entityEngine'
import type { ArtifactRecord } from '@/lib/artifacts/artifactStore'

const SESSION_ID = 'showtela-runtime-ingest'

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function personEntity(name: string, artifactId: string, timestamp: string): EntityRecord {
  return {
    id: `person:${slugify(name)}`,
    name,
    type: 'person',
    aliases: [],
    firstSeen: timestamp,
    lastSeen: timestamp,
    linkedArtifacts: [artifactId],
    linkedThreads: [SHOWTELA_RUNTIME_THREAD_ID],
    operationalContexts: ['anchor-directory'],
    continuityCount: 1,
    unresolvedLinks: 0,
    relatedArtifacts: [artifactId],
    relatedThreads: [SHOWTELA_RUNTIME_THREAD_ID],
    temporalClusters: [timestamp.slice(0, 10)],
    trustRank: TRUST_RANK['anchor-directory'],
    authoritySource: 'anchor-directory',
  }
}

function departmentEntity(name: string, artifactId: string, timestamp: string): EntityRecord {
  return {
    id: `rider-dept:${slugify(name)}`,  // prefix persists through Supabase — operationalContexts field is not in schema
    name,
    type: 'context',
    aliases: [],
    firstSeen: timestamp,
    lastSeen: timestamp,
    linkedArtifacts: [artifactId],
    linkedThreads: [SHOWTELA_RUNTIME_THREAD_ID],
    operationalContexts: ['rider-department'],
    continuityCount: 1,
    unresolvedLinks: 0,
    relatedArtifacts: [artifactId],
    relatedThreads: [SHOWTELA_RUNTIME_THREAD_ID],
    temporalClusters: [timestamp.slice(0, 10)],
    trustRank: TRUST_RANK['document'],
    authoritySource: 'document',
  }
}

function showArtifact(
  headline: string,
  isoDate: string,
  rawLine: string | undefined,
  venue: string | undefined,
  city: string | undefined,
  filename: string,
): ArtifactRecord {
  const ocid = createContinuityOcid(headline, isoDate)
  const id = deterministicArtifactId({
    title: headline,
    threadId: SHOWTELA_RUNTIME_THREAD_ID,
    sessionId: SESSION_ID,
    createdAt: isoDate,
  })

  const continuityEvent = {
    id: ocid,
    headline,
    body: rawLine ?? headline,
    timestamp: isoDate,
    tags: ['SHOW', 'CALENDAR'],
    linkedEntities: [venue, city].filter(Boolean) as string[],
    continuityObject: {
      id: ocid,
      kind: 'show-date',
      title: headline,
      summary: [venue, city].filter(Boolean).join(', ') || 'TBD',
      capturedAt: isoDate,
      provenance: { what: 'Show date extracted from tour calendar', when: isoDate, linkedEntity: venue },
      source: { mode: 'upload-files', assetNames: [filename] },
    },
  }

  return {
    id,
    title: headline,
    threadId: SHOWTELA_RUNTIME_THREAD_ID,
    sessionId: SESSION_ID,
    text: [headline, rawLine, `OCID: ${ocid}`].filter(Boolean).join('\n'),
    fileName: `show-${isoDate.slice(0, 10)}.json`,
    mimeType: 'application/json',
    entities: [venue, city].filter(Boolean) as string[],
    projects: [],
    lineageId: undefined,
    artifactGroupId: SHOWTELA_RUNTIME_ARTIFACT_GROUP_ID,
    createdAt: isoDate,
    pinned: false,
    classification: 'runtime_artifact',
    structure: JSON.stringify({ constitutionalEventId: null, continuityEvent, ocid }),
  }
}

export type DocumentHydration = {
  documentType: string
  personsActivated: number
  showDatesImported: number
  departmentsActivated: number
}

export type DocumentIngestResult = {
  ok: true
  eventId: string
  lineageId: string
  hydration: DocumentHydration
}

export async function ingestDocumentContinuity(input: ContinuityIngestionInput): Promise<DocumentIngestResult> {
  const timestamp = new Date().toISOString()
  const filename = input.assetContents?.[0]?.name ?? input.assetNames?.[0] ?? 'document'
  const content = (input.assetContents ?? []).map(a => a.content).join('\n\n---\n\n')
  const docType = classifyDocument(filename, content)

  const extraArtifacts: ArtifactRecord[] = []
  const extraEntities: EntityRecord[] = []
  let personsActivated = 0
  let showDatesImported = 0
  let departmentsActivated = 0
  let summaryHeadline = ''
  let summaryBody = ''

  if (docType === 'anchor-directory') {
    const persons = extractPersonsFromAnchorDirectory(content)
    personsActivated = persons.length

    const placeholderId = deterministicArtifactId({
      title: `anchor-directory-${timestamp.slice(0, 10)}`,
      threadId: SHOWTELA_RUNTIME_THREAD_ID,
      sessionId: SESSION_ID,
      createdAt: timestamp,
    })
    for (const p of persons) {
      extraEntities.push(personEntity(p.name, placeholderId, timestamp))
    }

    summaryHeadline = `Anchor Directory — ${personsActivated} crew member${personsActivated === 1 ? '' : 's'} activated`
    summaryBody = persons.length
      ? `Crew: ${persons.map(p => p.name).join(', ')}`
      : 'Anchor directory ingested.'
  }

  if (docType === 'tour-calendar') {
    const shows = extractShowDatesFromCalendar(content)
    showDatesImported = shows.length

    for (const show of shows) {
      const label = [show.venue, show.city, show.state].filter(Boolean).join(', ') || 'TBD'
      const headline = `Show — ${label}`
      extraArtifacts.push(showArtifact(headline, show.isoDate, show.rawLine, show.venue, show.city, filename))
    }

    const firstDate = shows[0]?.isoDate?.slice(0, 10) ?? ''
    const lastDate = shows.at(-1)?.isoDate?.slice(0, 10) ?? ''
    summaryHeadline = `Tour Calendar — ${showDatesImported} show${showDatesImported === 1 ? '' : 's'} imported`
    summaryBody = firstDate
      ? `Shows from ${firstDate} to ${lastDate}`
      : 'Tour calendar ingested.'
  }

  if (docType === 'production-rider') {
    const departments = extractDepartmentsFromRider(content)
    departmentsActivated = departments.length

    const placeholderId = deterministicArtifactId({
      title: `rider-${timestamp.slice(0, 10)}`,
      threadId: SHOWTELA_RUNTIME_THREAD_ID,
      sessionId: SESSION_ID,
      createdAt: timestamp,
    })
    for (const dept of departments) {
      extraEntities.push(departmentEntity(dept, placeholderId, timestamp))
    }

    summaryHeadline = `Production Rider — ${departmentsActivated} department${departmentsActivated === 1 ? '' : 's'} activated`
    summaryBody = departments.length
      ? `Departments: ${departments.join(', ')}`
      : 'Production rider ingested.'
  }

  if (docType === 'generic') {
    summaryHeadline = input.headline?.trim() || `${filename} added to continuity`
    summaryBody = input.body?.trim() || `Document ingested: ${filename}`
  }

  if (extraArtifacts.length > 0 || extraEntities.length > 0) {
    await persistDurableContinuity(SHOWTELA_WORKSPACE_ID, {
      artifacts: extraArtifacts,
      entities: extraEntities,
      snapshots: [],
    })
  }

  const canonicalResult = await ingestCanonicalContinuity({
    ...input,
    headline: summaryHeadline,
    body: summaryBody,
  })

  return {
    ok: true,
    eventId: canonicalResult.eventId,
    lineageId: canonicalResult.lineageId,
    hydration: {
      documentType: docType,
      personsActivated,
      showDatesImported,
      departmentsActivated,
    },
  }
}
