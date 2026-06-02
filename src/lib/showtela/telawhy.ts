import type { ArtifactRecord } from '@/lib/artifacts/artifactStore'
import type { TELAwhy } from './types'
import type { ShowTelaContinuityEventRecord } from './continuityEvents'

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

function stringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : []
}

function numberValue(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function recordValue(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function artifactKindLabel(kind?: string) {
  if (kind === 'directory') return 'Anchor Directory'
  if (kind === 'calendar') return 'Tour Calendar'
  if (kind === 'rider') return 'Production Rider'
  if (kind === 'daysheet') return 'Daysheet'
  return 'Runtime Artifact'
}

function whyForRecord(record: ShowTelaContinuityEventRecord, artifactKind?: string) {
  if (record.event_type === 'ANCHOR_UPLOADED' || record.event_type === 'PEOPLE_HYDRATED') {
    return 'This exists because the anchor directory introduced accountable people and departments into continuity.'
  }
  if (record.event_type === 'CALENDAR_UPLOADED' || record.event_type === 'CALENDAR_HYDRATED') {
    return 'This exists because the tour calendar supplied dated operational events for runtime scheduling.'
  }
  if (record.event_type === 'RIDER_UPLOADED' || record.event_type === 'OPERATIONS_HYDRATED') {
    return 'This exists because the production rider supplied operational departments and requirements.'
  }
  return `This exists because ${artifactKindLabel(artifactKind)} produced a stored continuity event.`
}

export function buildTELAwhyFromContinuityRecord(input: {
  record: ShowTelaContinuityEventRecord
  artifact?: ArtifactRecord
  hydratedAt?: string
}): TELAwhy {
  const { record, artifact } = input
  const counts = recordValue(record.metadata.counts)
  const artifactKind = stringValue(record.metadata.artifact_kind)
  const linkedEntities = stringList(record.metadata.linked_entities)
  const evidenceChunkIds = stringList(record.metadata.evidence_chunk_ids)
  const peopleCount = numberValue(counts.people)
  const operationsCount = numberValue(counts.operations)
  const calendarCount = numberValue(counts.calendar_events)
  const requirementsCount = numberValue(counts.requirements)
  const sourceTitle = artifact?.title ?? stringValue(record.metadata.source_artifact_title)
  const hasArtifact = Boolean(record.artifact_id || artifact?.id)

  const evidence = [
    sourceTitle ? `Source artifact: ${sourceTitle}` : undefined,
    peopleCount ? `${peopleCount} linked people` : undefined,
    operationsCount ? `${operationsCount} linked operations` : undefined,
    calendarCount ? `${calendarCount} linked calendar events` : undefined,
    requirementsCount ? `${requirementsCount} rider requirements` : undefined,
    record.source ? `Runtime source: ${record.source}` : undefined,
  ].filter((item): item is string => Boolean(item))

  const linkedOperations = ['RIDER_UPLOADED', 'OPERATIONS_HYDRATED'].includes(record.event_type)
    ? linkedEntities
    : []

  return {
    id: `telawhy:${record.event_id}`,
    status: hasArtifact || record.source ? 'verified' : 'low-provenance',
    whyThisExists: whyForRecord(record, artifactKind),
    evidenceRefs: {
      eventId: record.event_id,
      continuityRecordId: record.event_id,
      artifactId: record.artifact_id ?? artifact?.id,
      evidenceChunkIds: evidenceChunkIds.length > 0 ? evidenceChunkIds : artifact?.evidenceChunkIds,
    },
    sourceArtifact: hasArtifact ? {
      id: record.artifact_id ?? artifact?.id,
      title: sourceTitle,
      fileName: artifact?.fileName,
    } : undefined,
    importTimestamp: record.created_at,
    author: record.created_by || undefined,
    linkedEntities,
    linkedOperations,
    linkedCalendarEvents: calendarCount ? [`${calendarCount} calendar event${calendarCount === 1 ? '' : 's'}`] : [],
    continuityEvent: {
      id: record.event_id,
      type: record.event_type,
      title: record.title,
      timestamp: record.created_at,
    },
    evidence: [
      `Event ID: ${record.event_id}`,
      `Continuity Record ID: ${record.event_id}`,
      record.artifact_id || artifact?.id ? `Artifact ID: ${record.artifact_id ?? artifact?.id}` : undefined,
      ...((evidenceChunkIds.length > 0 ? evidenceChunkIds : artifact?.evidenceChunkIds ?? []).map((id) => `Evidence Chunk ID: ${id}`)),
      ...(evidence.length > 0 ? evidence : ['LOW PROVENANCE: no source artifact metadata is attached.']),
    ].filter((item): item is string => Boolean(item)),
    lineage: [
      sourceTitle ? `Artifact: ${sourceTitle}` : 'Artifact: LOW PROVENANCE',
      `Continuity Event: ${record.event_type}`,
      record.title ? `Runtime Surface: ${record.title}` : 'Runtime Surface: ShowTELA',
    ],
    freshness: {
      lastUpdated: input.hydratedAt ?? record.created_at,
      label: input.hydratedAt ? 'Freshness from latest hydration pass.' : 'Freshness from continuity event timestamp.',
    },
  }
}

export function buildInsufficientTELAwhy(input: {
  id: string
  title: string
  detail?: string
  lastUpdated?: string
}): TELAwhy {
  return {
    id: `telawhy:${input.id}`,
    status: 'insufficient-continuity',
    whyThisExists: input.detail ?? 'INSUFFICIENT CONTINUITY: ShowTELA does not have enough provenance to explain this object yet.',
    evidenceRefs: {
      eventId: input.id,
      continuityRecordId: input.id,
    },
    linkedEntities: [],
    linkedOperations: [],
    linkedCalendarEvents: [],
    evidence: ['INSUFFICIENT CONTINUITY: no source artifact or continuity event is attached.'],
    lineage: ['Artifact: missing', 'Continuity Event: missing', `Runtime Surface: ${input.title}`],
    freshness: {
      lastUpdated: input.lastUpdated,
      label: input.lastUpdated ? 'Last updated from display timestamp only.' : 'No freshness timestamp available.',
    },
  }
}
