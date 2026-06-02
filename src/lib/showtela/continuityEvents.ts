import { parseMarkdownCalendar } from '@/lib/continuity/parseMarkdownCalendar'
import { parseMarkdownDirectory } from '@/lib/continuity/parseMarkdownDirectory'
import { parseMarkdownRider } from '@/lib/venue-intelligence/rider'
import type { ArtifactRecord } from '@/lib/artifacts/artifactStore'
import type { RuntimeEvent } from '@/lib/runtime/runtimeTypes'
import { SHOWTELA_ARCHIVED_EVENT_TYPE, SHOWTELA_CREATED_EVENT_TYPE } from './lifecycleRegistry'

export const SHOWTELA_EVENT_TYPE_LABELS = {
  created: 'SHOWTELA_CREATED',
  archived: 'SHOWTELA_ARCHIVED',
  anchorUploaded: 'ANCHOR_UPLOADED',
  riderUploaded: 'RIDER_UPLOADED',
  calendarUploaded: 'CALENDAR_UPLOADED',
  daysheetUploaded: 'DAYSHEET_UPLOADED',
  peopleHydrated: 'PEOPLE_HYDRATED',
  operationsHydrated: 'OPERATIONS_HYDRATED',
  calendarHydrated: 'CALENDAR_HYDRATED',
  artifactCreated: 'ARTIFACT_CREATED',
  artifactUpdated: 'ARTIFACT_UPDATED',
} as const

export const SHOWTELA_RUNTIME_EVENT_TYPES = {
  artifactUploaded: 'showtela.artifact.uploaded',
  peopleHydrated: 'showtela.people.hydrated',
  operationsHydrated: 'showtela.operations.hydrated',
  calendarHydrated: 'showtela.calendar.hydrated',
} as const

export type ShowTelaContinuityEventRecord = {
  event_id: string
  event_type: string
  showtela_id: string
  entity_id: string | null
  artifact_id: string | null
  created_by: string
  created_at: string
  title: string
  description: string
  source: string
  metadata: Record<string, unknown>
}

export type ShowTelaHealth = {
  people: number
  operations: number
  calendarEvents: number
  artifacts: number
  events: number
  lastActivityAt?: string
}

type ArtifactEvidence = {
  artifactId?: string
  artifactTitle?: string
  artifactKind: 'directory' | 'calendar' | 'rider' | 'daysheet' | 'generic'
  peopleCount: number
  operationsCount: number
  calendarCount: number
  requirementsCount: number
  linkedEntities: string[]
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

function stringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : []
}

function detectArtifactEvidence(artifact?: ArtifactRecord): ArtifactEvidence {
  if (!artifact) {
    return {
      artifactKind: 'generic',
      peopleCount: 0,
      operationsCount: 0,
      calendarCount: 0,
      requirementsCount: 0,
      linkedEntities: [],
    }
  }

  const text = artifact.text ?? ''
  const directory = parseMarkdownDirectory(text)
  const calendar = parseMarkdownCalendar(text)
  const rider = parseMarkdownRider(text)
  const fileName = artifact.fileName?.toLowerCase() ?? ''

  const artifactKind = (() => {
    if (/daysheet/i.test(artifact.title) || /daysheet/i.test(fileName)) return 'daysheet' as const
    if (/production rider/i.test(text) || /rider/i.test(artifact.title)) return 'rider' as const
    if (calendar.events.length > 0) return 'calendar' as const
    if (directory.people.length > 0 || directory.departments.length > 0) return 'directory' as const
    return 'generic' as const
  })()

  const operationsCount = new Set([
    ...directory.departments,
    ...calendar.departments,
    ...rider.departments,
  ]).size

  return {
    artifactId: artifact.id,
    artifactTitle: artifact.title,
    artifactKind,
    peopleCount: directory.people.length,
    operationsCount,
    calendarCount: calendar.events.length,
    requirementsCount: rider.requirements.length,
    linkedEntities: Array.from(new Set([
      ...(artifact.entities ?? []),
      ...(artifact.projects ?? []),
    ])),
  }
}

function artifactLabel(kind: ArtifactEvidence['artifactKind']) {
  if (kind === 'directory') return SHOWTELA_EVENT_TYPE_LABELS.anchorUploaded
  if (kind === 'rider') return SHOWTELA_EVENT_TYPE_LABELS.riderUploaded
  if (kind === 'calendar') return SHOWTELA_EVENT_TYPE_LABELS.calendarUploaded
  if (kind === 'daysheet') return SHOWTELA_EVENT_TYPE_LABELS.daysheetUploaded
  return SHOWTELA_EVENT_TYPE_LABELS.artifactCreated
}

function titleForUpload(evidence: ArtifactEvidence) {
  if (evidence.artifactTitle) return evidence.artifactTitle
  if (evidence.artifactKind === 'directory') return 'Anchor Directory Uploaded'
  if (evidence.artifactKind === 'rider') return 'Production Rider Uploaded'
  if (evidence.artifactKind === 'calendar') return 'Calendar Uploaded'
  if (evidence.artifactKind === 'daysheet') return 'Daysheet Uploaded'
  return 'Artifact Uploaded'
}

function descriptionForUpload(evidence: ArtifactEvidence) {
  if (evidence.artifactKind === 'directory') return 'Anchor directory stored as continuity evidence.'
  if (evidence.artifactKind === 'rider') return 'Production rider stored as continuity evidence.'
  if (evidence.artifactKind === 'calendar') return 'Calendar stored as continuity evidence.'
  if (evidence.artifactKind === 'daysheet') return 'Daysheet stored as continuity evidence.'
  return 'Artifact stored as continuity evidence.'
}

function continuityEventFromRuntimeEvent(input: {
  event: RuntimeEvent
  showTelaId: string
  artifactsById: Map<string, ArtifactRecord>
  fallbackShowTelaName?: string
}): ShowTelaContinuityEventRecord[] {
  const payload = (input.event.payload ?? {}) as Record<string, unknown>
  const artifactId = stringValue(payload.artifactId) ?? stringValue(payload.insertedId)
  const artifact = artifactId ? input.artifactsById.get(artifactId) : undefined
  const evidence = detectArtifactEvidence(artifact)
  const createdBy = stringValue(payload.submittedBy) ?? stringValue(payload.owner) ?? input.event.source
  const entityId = stringValue(payload.entityId) ?? stringValue(payload.threadId) ?? stringList(payload.linkedEntities)[0] ?? null
  const evidenceChunkIds = stringList(payload.evidenceChunkIds).length > 0
    ? stringList(payload.evidenceChunkIds)
    : artifact?.evidenceChunkIds ?? []
  const common = {
    showtela_id: input.showTelaId,
    entity_id: entityId,
    artifact_id: artifactId ?? evidence.artifactId ?? null,
    created_by: createdBy,
    created_at: input.event.createdAt,
    source: stringValue(payload.sourceMode) ?? input.event.source,
    metadata: {
      runtime_event_type: input.event.type,
      replay_sequence: input.event.replaySequence ?? null,
      lineage_id: input.event.lineageId ?? null,
      linked_entities: stringList(payload.linkedEntities).length > 0 ? stringList(payload.linkedEntities) : evidence.linkedEntities,
      evidence_chunk_ids: evidenceChunkIds,
      artifact_kind: evidence.artifactKind,
      source_artifact_title: evidence.artifactTitle ?? null,
      counts: {
        people: evidence.peopleCount,
        operations: evidence.operationsCount,
        calendar_events: evidence.calendarCount,
        requirements: evidence.requirementsCount,
      },
    },
  }

  if (input.event.type === SHOWTELA_CREATED_EVENT_TYPE) {
    const showTelaName = stringValue(payload.showTelaName) ?? input.fallbackShowTelaName ?? 'ShowTELA'
    return [{
      event_id: input.event.id,
      event_type: SHOWTELA_EVENT_TYPE_LABELS.created,
      title: `${showTelaName} created`,
      description: 'ShowTELA registered and opened in a clean state.',
      ...common,
    }]
  }

  if (input.event.type === SHOWTELA_ARCHIVED_EVENT_TYPE) {
    const showTelaName = stringValue(payload.showTelaName) ?? input.fallbackShowTelaName ?? 'ShowTELA'
    return [{
      event_id: input.event.id,
      event_type: SHOWTELA_EVENT_TYPE_LABELS.archived,
      title: `${showTelaName} archived`,
      description: 'ShowTELA moved from active registry to archived replay.',
      ...common,
    }]
  }

  if (input.event.type === SHOWTELA_RUNTIME_EVENT_TYPES.artifactUploaded || input.event.type === 'continuity.ingested') {
    return [{
      event_id: input.event.id,
      event_type: artifactLabel(evidence.artifactKind),
      title: titleForUpload(evidence),
      description: descriptionForUpload(evidence),
      ...common,
    }]
  }

  if (input.event.type === SHOWTELA_RUNTIME_EVENT_TYPES.peopleHydrated) {
    return [{
      event_id: input.event.id,
      event_type: SHOWTELA_EVENT_TYPE_LABELS.peopleHydrated,
      title: 'People Hydrated',
      description: `${evidence.peopleCount} people created from uploaded evidence.`,
      ...common,
    }]
  }

  if (input.event.type === SHOWTELA_RUNTIME_EVENT_TYPES.operationsHydrated) {
    return [{
      event_id: input.event.id,
      event_type: SHOWTELA_EVENT_TYPE_LABELS.operationsHydrated,
      title: 'Operations Hydrated',
      description: `${evidence.operationsCount} operations created from uploaded evidence.`,
      ...common,
    }]
  }

  if (input.event.type === SHOWTELA_RUNTIME_EVENT_TYPES.calendarHydrated) {
    return [{
      event_id: input.event.id,
      event_type: SHOWTELA_EVENT_TYPE_LABELS.calendarHydrated,
      title: 'Calendar Hydrated',
      description: `${evidence.calendarCount} calendar events created from uploaded evidence.`,
      ...common,
    }]
  }

  if (!input.event.type.startsWith('showtela.') && !input.event.type.startsWith('continuity.')) {
    return []
  }

  return [{
    event_id: input.event.id,
    event_type: input.event.type.toUpperCase().replace(/[^A-Z0-9]+/g, '_'),
    title: stringValue(payload.headline) ?? stringValue(payload.title) ?? input.event.type,
    description: stringValue(payload.body) ?? 'Runtime event persisted as continuity evidence.',
    ...common,
  }]
}

export function buildShowTelaContinuityEvents(input: {
  showTelaId: string
  showTelaName?: string
  runtimeEvents: RuntimeEvent[]
  artifacts: ArtifactRecord[]
}) {
  const artifactsById = new Map(input.artifacts.map((artifact) => [artifact.id, artifact]))
  return input.runtimeEvents
    .flatMap((event) => continuityEventFromRuntimeEvent({
      event,
      showTelaId: input.showTelaId,
      fallbackShowTelaName: input.showTelaName,
      artifactsById,
    }))
    .sort((left, right) => right.created_at.localeCompare(left.created_at))
}
