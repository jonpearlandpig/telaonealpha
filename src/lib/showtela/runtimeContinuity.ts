import { deterministicArtifactId, type ArtifactRecord } from '@/lib/artifacts/artifactStore'
import { normalizeContinuityIngestion, type ContinuityIngestionInput } from '@/lib/continuity/normalize-ingestion'
import { parseMarkdownDirectory } from '@/lib/continuity/parseMarkdownDirectory'
import { createConstitutionalEvent } from '@/lib/constitutional/create-event'
import type { ConstitutionalEvent } from '@/lib/constitutional/types'
import { extractEntities, type EntityRecord, type EntityType } from '@/lib/entities/entityEngine'
import { persistDurableContinuity } from '@/lib/runtime/durableMemory'
import { deterministicSnapshotId, type ContinuitySnapshot } from '@/lib/runtime/continuitySnapshots'
import { listWorkspaceArtifacts } from '@/lib/supabase/queries'
import { threadContinuity } from './threadContinuity'
import type { ContinuityEvent, OperationEntity, PersonEntity, RuntimeTimelineItem, ShowTelaHomeData } from './types'

export const SHOWTELA_WORKSPACE_ID = 'tela-showtela'
export const SHOWTELA_SNAPSHOT_ID = 'showtela-home-snapshot'
export const SHOWTELA_RUNTIME_THREAD_ID = 'showtela-runtime-continuity'
export const SHOWTELA_RUNTIME_ARTIFACT_GROUP_ID = 'showtela-runtime-continuity'
const SHOWTELA_RUNTIME_SESSION_ID = 'showtela-runtime-ingest'
const ENTITY_STOPLIST = new Set(['linked entities', 'owner', 'ocid'])

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function timelineFromFeed(feed: ContinuityEvent[]): RuntimeTimelineItem[] {
  return feed.slice(0, 20).map((event, idx) => ({
    id: `timeline-${event.id}`,
    timestamp: event.timestamp ?? new Date().toISOString(),
    actor: event.owner?.name ?? 'Operations',
    summary: event.headline,
    continuityObjectId: event.continuityObject?.id ?? event.threadId ?? event.id,
    pressureDelta: (
      (event.pressure === 'high' ? 2 : event.pressure === 'medium' ? 1 : 0) -
      (idx > 0 && feed[idx - 1]?.pressure === 'high' ? 1 : 0)
    ) as -2 | -1 | 0 | 1 | 2,
  }))
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

function parseArtifactPayload(payload?: string): ArtifactRecord | null {
  if (!payload) return null
  try {
    const parsed = JSON.parse(payload) as ArtifactRecord
    return parsed && typeof parsed.id === 'string' && typeof parsed.threadId === 'string' ? parsed : null
  } catch {
    return null
  }
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
    console.warn('[showtela:runtimeContinuity] constitutional event write skipped:', String(err))
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

export function mergeContinuityIntoShowTelaHome(data: ShowTelaHomeData, events: ContinuityEvent[]): ShowTelaHomeData {
  const byId = new Map<string, ContinuityEvent>()
  for (const event of [...events, ...data.continuityFeed]) {
    byId.set(event.id, event)
  }
  const continuityFeed = threadContinuity([...byId.values()])
    .sort((left, right) => new Date(right.timestamp ?? 0).getTime() - new Date(left.timestamp ?? 0).getTime())
    .slice(0, 50)

  return {
    ...data,
    continuityFeed,
    runtimeTimeline: timelineFromFeed(continuityFeed),
  }
}

export async function loadPersistedRuntimeContinuityEvents() {
  const rows = await listWorkspaceArtifacts(SHOWTELA_WORKSPACE_ID)
  return rows
    .filter((row) =>
      row.threadId === SHOWTELA_RUNTIME_THREAD_ID ||
      row.artifactGroupId === SHOWTELA_RUNTIME_ARTIFACT_GROUP_ID
    )
    .map((row) => parseArtifactPayload(row.payload))
    .filter(Boolean)
    .map((artifact) => {
      if (!artifact?.structure) return null
      try {
        const parsed = JSON.parse(artifact.structure) as { continuityEvent?: ContinuityEvent }
        const event = parsed.continuityEvent
        if (!event) return null
        return {
          ...event,
          threadId: event.threadId ?? event.continuityObject?.id ?? event.id,
        }
      } catch {
        return null
      }
    })
    .filter(Boolean)
    .sort((left, right) => new Date(right?.timestamp ?? 0).getTime() - new Date(left?.timestamp ?? 0).getTime()) as ContinuityEvent[]
}

export async function mergePersistedRuntimeContinuity(data: ShowTelaHomeData) {
  const persisted = await loadPersistedRuntimeContinuityEvents()
  if (persisted.length === 0) return data
  return mergeContinuityIntoShowTelaHome(data, persisted)
}

export function createShowTelaDurableSnapshot(input: {
  artifact: ArtifactRecord
  constitutionalEvent: ConstitutionalEvent | null
  data: ShowTelaHomeData
  entities: EntityRecord[]
  event: ContinuityEvent
  ocid: string
}): ContinuitySnapshot {
  const createdAt = input.event.timestamp ?? input.artifact.createdAt
  return {
    id: deterministicSnapshotId(SHOWTELA_RUNTIME_THREAD_ID, createdAt),
    createdAt,
    threadRefs: Array.from(new Set([
      SHOWTELA_RUNTIME_THREAD_ID,
      ...input.data.continuityFeed.map((event) => event.threadId ?? event.id),
    ])).slice(0, 20),
    entityRefs: input.entities.map((entity) => entity.id),
    lineageRefs: Array.from(new Set([
      input.event.lineageRef?.lineageId,
      input.constitutionalEvent?.id,
      input.ocid,
    ].filter(Boolean) as string[])),
    activeArtifacts: [input.artifact],
    relatedEntities: input.entities,
    unresolvedThreads: [],
    recentLineage: [input.artifact],
    activeOperationalContexts: [SHOWTELA_RUNTIME_SESSION_ID],
    continuityMetadata: {
      unresolvedCount: input.data.unresolved.length,
      pinnedCount: 0,
      provenanceCount: input.data.continuityFeed.filter((event) => event.lineageRef?.lineageId).length,
      temporalWeight: 100,
    },
  }
}

function extractDirectoryData(
  assetContents: Array<{ name: string; content: string; type: string }>,
): { newPeople: PersonEntity[]; newOperations: OperationEntity[] } {
  const people: PersonEntity[] = []
  const operations: OperationEntity[] = []
  const seenDepts = new Set<string>()

  for (const file of assetContents) {
    if (!file.content.trim()) continue
    const parsed = parseMarkdownDirectory(file.content)

    for (const p of parsed.people) {
      people.push({
        id: `dir-${slugify(p.name)}`,
        name: p.name,
        role: p.role || p.department || undefined,
        avatar: '',
        active: true,
        partner: false,
        unresolvedCount: 0,
      })
    }

    for (const dept of parsed.departments) {
      const key = dept.toLowerCase()
      if (!seenDepts.has(key)) {
        seenDepts.add(key)
        operations.push({
          id: `dept-${slugify(dept)}`,
          title: dept,
          status: 'active',
          unresolvedCount: 0,
          latestMovement: 'Anchored from crew directory',
        })
      }
    }
  }

  return { newPeople: people, newOperations: operations }
}

function mergeDirectoryIntoHome(
  data: ShowTelaHomeData,
  newPeople: PersonEntity[],
  newOperations: OperationEntity[],
): ShowTelaHomeData {
  const existingNames = new Set(data.activeOps.map(p => p.name.toLowerCase()))
  const uniquePeople = newPeople.filter(p => !existingNames.has(p.name.toLowerCase()))

  const existingOps = new Set(data.operations.map(o => o.title.toLowerCase()))
  const uniqueOps = newOperations.filter(o => !existingOps.has(o.title.toLowerCase()))

  return {
    ...data,
    activeOps: [...data.activeOps, ...uniquePeople].slice(0, 20),
    operations: [...data.operations, ...uniqueOps],
    source: 'supabase',
    diagnosticState: 'persistence-connected',
  }
}

export async function ingestShowTelaContinuity(input: {
  baseData: ShowTelaHomeData
  payload: ContinuityIngestionInput
  submittedBy: string
}) {
  const timestamp = new Date().toISOString()
  const latestLineage = input.baseData.continuityFeed[0]?.lineageRef

  // Extract text from uploaded files for semantic analysis
  const fileContents = (input.payload.assetContents ?? [])
    .filter(f => f.content.trim().length > 0)
    .map(f => f.content.trim())

  // Parse crew directories FIRST so the dispatch headline reflects what was extracted
  const rawAssets = input.payload.assetContents ?? []
  console.log('[TELA:TRACE] runtimeContinuity assetContents', {
    count: rawAssets.length,
    names: rawAssets.map(a => a.name),
    firstContentLength: rawAssets[0]?.content?.length ?? 0,
    firstContentPreview: rawAssets[0]?.content?.slice(0, 500) ?? null,
  })
  const { newPeople, newOperations } = extractDirectoryData(rawAssets)
  console.log('[TELA:TRACE] extractDirectoryData result', {
    newPeopleCount: newPeople.length,
    newOperationsCount: newOperations.length,
    firstPerson: newPeople[0]?.name ?? null,
    firstOperation: newOperations[0]?.title ?? null,
  })
  const primaryFileName = input.payload.assetNames?.[0] ?? ''
  const basePayload: ContinuityIngestionInput = newPeople.length > 0
    ? {
        ...input.payload,
        headline: input.payload.headline?.trim()
          || (primaryFileName ? primaryFileName.replace(/\.[^.]+$/, '') : 'Crew directory') + ' ingested',
        body: input.payload.body?.trim()
          || `${newPeople.length} ${newPeople.length === 1 ? 'person' : 'people'} and ${newOperations.length} department${newOperations.length === 1 ? '' : 's'} extracted. Operational graph updated.`,
      }
    : input.payload

  const headlineSeed = basePayload.headline?.trim() || basePayload.body?.trim() || 'continuity'
  const ocid = createContinuityOcid(headlineSeed, timestamp)
  const event = normalizeContinuityIngestion(basePayload, {
    author: input.submittedBy,
    continuityObjectId: ocid,
    eventId: ocid,
    existingLineageChain: latestLineage?.chain,
    lineageParentId: latestLineage?.lineageId,
    timestamp,
  })
  const constitutionalEvent = await tryCreateContinuityEventRecord({
    event,
    ocid,
    submittedBy: input.submittedBy,
  })
  const artifact = createRuntimeContinuityArtifact({
    constitutionalEvent,
    event,
    ocid,
    fileContents,
  })
  const entities = extractContinuityEntities(event, artifact)

  // Persist artifact first — this is the critical path for cache hydration.
  await persistDurableContinuity(SHOWTELA_WORKSPACE_ID, {
    artifacts: [artifact],
    entities: [],
    snapshots: [],
  })

  // Entity persistence is secondary telemetry. Failures must not abort the ingest.
  try {
    await persistDurableContinuity(SHOWTELA_WORKSPACE_ID, {
      artifacts: [],
      entities,
      snapshots: [],
    })
  } catch (err) {
    console.error('[TELA:TRACE] entity persistence non-fatal error — ingest continues:', String(err))
  }

  const feedMerged = mergeContinuityIntoShowTelaHome(input.baseData, [event])
  const mergedData: ShowTelaHomeData = newPeople.length > 0
    ? mergeDirectoryIntoHome(feedMerged, newPeople, newOperations)
    : { ...feedMerged, source: 'supabase', diagnosticState: 'persistence-connected' }
  console.log('[TELA:TRACE] mergedData', {
    source: mergedData.source,
    activeOpsCount: mergedData.activeOps.length,
    operationsCount: mergedData.operations.length,
    feedCount: mergedData.continuityFeed.length,
  })

  const snapshot = createShowTelaDurableSnapshot({
    artifact,
    constitutionalEvent,
    data: mergedData,
    entities,
    event,
    ocid,
  })

  await persistDurableContinuity(SHOWTELA_WORKSPACE_ID, {
    artifacts: [],
    entities: [],
    snapshots: [snapshot],
  })

  return {
    artifact,
    constitutionalEvent,
    data: mergedData,
    entities,
    event,
    ocid,
    snapshot,
  }
}
