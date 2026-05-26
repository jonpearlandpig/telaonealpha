import { deterministicArtifactId, type ArtifactRecord } from '@/lib/artifacts/artifactStore'
import { createConstitutionalEvent } from '@/lib/constitutional/create-event'
import type { ConstitutionalEvent } from '@/lib/constitutional/types'
import { extractEntities, type EntityRecord, type EntityType } from '@/lib/entities/entityEngine'
import {
  SHOWTELA_RUNTIME_ARTIFACT_GROUP_ID,
  SHOWTELA_RUNTIME_THREAD_ID,
} from './runtimeIds'
import type { ContinuityEvent } from './types'

const SHOWTELA_RUNTIME_SESSION_ID = 'showtela-runtime-ingest'
const ENTITY_STOPLIST = new Set(['linked entities', 'owner', 'ocid'])

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function dedupeEntities(entities: EntityRecord[]) {
  const merged = new Map<string, EntityRecord>()
  for (const entity of entities) {
    if (ENTITY_STOPLIST.has(entity.name.toLowerCase())) continue
    const existing = merged.get(entity.id)
    if (!existing) {
      merged.set(entity.id, entity)
      continue
    }
    merged.set(entity.id, {
      ...existing,
      lastSeen: entity.lastSeen > existing.lastSeen ? entity.lastSeen : existing.lastSeen,
      continuityCount: existing.continuityCount + entity.continuityCount,
      unresolvedLinks: Math.max(existing.unresolvedLinks, entity.unresolvedLinks),
      linkedArtifacts: Array.from(new Set([...existing.linkedArtifacts, ...entity.linkedArtifacts])),
      linkedThreads: Array.from(new Set([...existing.linkedThreads, ...entity.linkedThreads])),
      operationalContexts: Array.from(new Set([...existing.operationalContexts, ...entity.operationalContexts])),
      relatedArtifacts: Array.from(new Set([...existing.relatedArtifacts, ...entity.relatedArtifacts])),
      relatedThreads: Array.from(new Set([...existing.relatedThreads, ...entity.relatedThreads])),
      temporalClusters: Array.from(new Set([...existing.temporalClusters, ...entity.temporalClusters])),
    })
  }
  return [...merged.values()]
}

function namedEntity(name: string, type: EntityType, artifact: ArtifactRecord, timestamp: string): EntityRecord {
  const id = `${type}:${slugify(name)}`
  return {
    id,
    name,
    type,
    aliases: [],
    firstSeen: timestamp,
    lastSeen: timestamp,
    linkedArtifacts: [artifact.id],
    linkedThreads: [artifact.threadId],
    operationalContexts: [artifact.sessionId],
    continuityCount: 1,
    unresolvedLinks: /todo|unresolved|follow-up|pending|waiting/i.test(artifact.text ?? '') ? 1 : 0,
    relatedArtifacts: [artifact.id],
    relatedThreads: [artifact.threadId],
    temporalClusters: [timestamp.slice(0, 10)],
  }
}

function manualEntities(event: ContinuityEvent, artifact: ArtifactRecord): EntityRecord[] {
  const timestamp = event.timestamp ?? artifact.createdAt
  const refs = [
    event.owner?.name ? { name: event.owner.name, type: 'person' as const } : null,
    ...(event.linkedEntities ?? []).map((name) => ({
      name,
      type: name.toLowerCase().includes('crusade') || name.toLowerCase().includes('venue') ? 'project' as const : 'person' as const,
    })),
  ].filter(Boolean) as Array<{ name: string; type: EntityType }>

  return refs
    .map((item) => ({ ...item, name: item.name.trim() }))
    .filter((item) => item.name.length > 0)
    .map((item) => namedEntity(item.name, item.type, artifact, timestamp))
}

function serializeRuntimeMetadata(input: {
  constitutionalEventId: string | null
  event: ContinuityEvent
  ocid: string
}) {
  return JSON.stringify({
    constitutionalEventId: input.constitutionalEventId,
    continuityEvent: input.event,
    ocid: input.ocid,
  })
}

export function createContinuityOcid(headline: string, timestamp: string) {
  const suffix = slugify(headline).slice(0, 48) || 'continuity'
  return `ocid:showtela:${timestamp.slice(0, 10)}:${suffix}`
}

export async function tryCreateContinuityEventRecord(input: {
  event: ContinuityEvent
  ocid: string
  submittedBy: string
}) {
  try {
    const event = await createConstitutionalEvent({
      event_type: 'continuity_updated',
      title: input.event.headline,
      summary: input.event.body ?? input.event.continuityObject?.summary ?? null,
      human_actor: input.submittedBy,
      operator_overlays: ['showtela'],
      governance_state: 'constitutional',
      execution_state: 'completed',
      decision_state: 'signal',
      continuity_refs: [input.ocid, input.event.continuityObject?.id ?? input.event.id],
      model_participants: [],
      routing_metadata: {
        ingestionSurface: input.event.authorshipTrace?.surface ?? 'ingest',
        source: 'showtela',
      },
      confidence_score: 1,
      reversible: true,
      metadata: {
        linkedEntities: input.event.linkedEntities ?? [],
        lineageId: input.event.lineageRef?.lineageId ?? null,
        ocid: input.ocid,
      },
    })
    return event
  } catch (err) {
    console.warn('[showtela:continuityRecord] constitutional event write skipped:', String(err))
    return null
  }
}

export function createRuntimeContinuityArtifact(input: {
  constitutionalEvent: ConstitutionalEvent | null
  event: ContinuityEvent
  ocid: string
  fileContents?: string[]
}): ArtifactRecord {
  const createdAt = input.event.timestamp ?? new Date().toISOString()
  const title = input.event.headline
  const fileText = input.fileContents?.filter(Boolean).join('\n\n---\n\n') ?? null
  const text = [
    input.event.headline,
    input.event.body ?? null,
    fileText,
    input.event.owner?.name ? `Owner: ${input.event.owner.name}` : null,
    input.event.linkedEntities?.length ? `Linked Entities: ${input.event.linkedEntities.join(', ')}` : null,
    `OCID: ${input.ocid}`,
    input.constitutionalEvent ? `Constitutional Event: ${input.constitutionalEvent.id}` : null,
  ].filter(Boolean).join('\n')

  return {
    id: deterministicArtifactId({
      title,
      threadId: SHOWTELA_RUNTIME_THREAD_ID,
      sessionId: SHOWTELA_RUNTIME_SESSION_ID,
      createdAt,
    }),
    title,
    threadId: SHOWTELA_RUNTIME_THREAD_ID,
    sessionId: SHOWTELA_RUNTIME_SESSION_ID,
    text,
    fileName: `continuity-${slugify(input.ocid)}.json`,
    mimeType: 'application/json',
    entities: Array.from(new Set([
      input.event.owner?.name,
      ...(input.event.linkedEntities ?? []),
    ].filter(Boolean) as string[])),
    projects: input.event.linkedEntities?.filter((item) => item.toLowerCase().includes('crusade') || item.toLowerCase().includes('venue')) ?? [],
    lineageId: input.event.lineageRef?.lineageId,
    artifactGroupId: SHOWTELA_RUNTIME_ARTIFACT_GROUP_ID,
    createdAt,
    pinned: false,
    classification: 'runtime_artifact',
    structure: serializeRuntimeMetadata({
      constitutionalEventId: input.constitutionalEvent?.id ?? null,
      event: input.event,
      ocid: input.ocid,
    }),
  }
}

export function extractContinuityEntities(event: ContinuityEvent, artifact: ArtifactRecord) {
  const extracted = extractEntities(artifact.text ?? `${event.headline}\n${event.body ?? ''}`, artifact)
  return dedupeEntities([...extracted, ...manualEntities(event, artifact)])
}
