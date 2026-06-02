import { bootstrapRuntimeSpine } from '@/lib/runtime/bootstrap'
import { emitRuntimeEvent } from '@/lib/runtime/eventBus'
import { orchestrateRuntimeAction } from '@/lib/runtime/orchestration'
import { ACTIONS } from '@/lib/runtime/actions'
import { persistDurableContinuity } from '@/lib/runtime/durableMemory'
import {
  normalizeContinuityIngestionWithLLM,
  type ContinuityIngestionInput,
  type NormalizeContinuityIngestionOptions,
} from './normalize-ingestion'
import {
  createContinuityOcid,
  tryCreateContinuityEventRecord,
  createRuntimeContinuityArtifact,
  extractContinuityEntities,
} from '@/lib/showtela/continuityRecord'
import {
  createEvidenceChunksFromText,
  evidenceChunkIdsForEvent,
  evidenceChunkToArtifact,
  sourceFileLabel,
} from '@/lib/showtela/evidenceAuthority'
import { parseMarkdownCalendar } from '@/lib/continuity/parseMarkdownCalendar'
import { parseMarkdownDirectory } from '@/lib/continuity/parseMarkdownDirectory'
import { parseMarkdownRider } from '@/lib/venue-intelligence/rider'
import { SHOWTELA_RUNTIME_EVENT_TYPES } from '@/lib/showtela/continuityEvents'
import { SHOWTELA_WORKSPACE_ID } from '@/lib/showtela/runtimeIds'

export async function ingestCanonicalContinuity(
  input: ContinuityIngestionInput,
  options?: NormalizeContinuityIngestionOptions,
): Promise<{ ok: true; eventId: string; lineageId: string }> {
  const workspaceId = input.workspaceId?.trim() || SHOWTELA_WORKSPACE_ID
  const timestamp = new Date().toISOString()
  const submittedBy = options?.author ?? input.owner ?? 'Operations'

  const fileContents = (input.assetContents ?? [])
    .filter(f => f.content.trim().length > 0)
    .map(f => f.content.trim())
  const evidenceChunks = (input.assetContents ?? []).flatMap((asset) => createEvidenceChunksFromText({
    sourceFile: sourceFileLabel(asset.name),
    extractedText: asset.content,
  }))
  const evidenceChunkArtifacts = evidenceChunks.map((chunk) => evidenceChunkToArtifact(chunk, timestamp))
  const fileExtractionNotes = (input.assetContents ?? [])
    .map((asset) => {
      const status = asset.extractionStatus ?? (asset.content.trim() ? 'extracted' : 'stored-only')
      const detail = asset.extractionDetail ? ` — ${asset.extractionDetail}` : ''
      return `${asset.name}: ${status}${detail}`
    })
  const fileEvidence = fileExtractionNotes.length > 0
    ? [`File extraction results:\n${fileExtractionNotes.map((line) => `- ${line}`).join('\n')}`]
    : []

  const headlineSeed = input.headline?.trim() || input.body?.trim() || 'continuity'
  const ocid = createContinuityOcid(headlineSeed, timestamp)

  const normalizedEvent = await normalizeContinuityIngestionWithLLM(input, {
    author: submittedBy,
    continuityObjectId: ocid,
    eventId: ocid,
    existingLineageChain: options?.existingLineageChain,
    lineageParentId: options?.lineageParentId,
    timestamp,
  })
  const event = {
    ...normalizedEvent,
    evidenceChunkIds: evidenceChunkIdsForEvent(normalizedEvent, evidenceChunks),
  }

  const lineageId = event.lineageRef?.lineageId ?? ocid

  // Persist durable artifact + entities — hydrateRuntime() reads these via loadDurableContinuity()
  const constitutionalEvent = await tryCreateContinuityEventRecord({ event, ocid, submittedBy })
  const artifact = createRuntimeContinuityArtifact({ constitutionalEvent, event, ocid, fileContents: [...fileEvidence, ...fileContents] })
  const entities = extractContinuityEntities(event, artifact)

  try {
    await persistDurableContinuity(workspaceId, { artifacts: [artifact, ...evidenceChunkArtifacts], entities, snapshots: [] })
  } catch (err) {
    console.error('[runtimeIngest] durable persistence non-fatal:', String(err))
  }

  // Emit to runtime_events via bootstrap persistence handler
  bootstrapRuntimeSpine()

  await orchestrateRuntimeAction({
    workspaceId,
    action: ACTIONS.INGEST_CONTINUITY,
    authority: 'S2',
    governanceState: 'approved',
    executionState: 'completed',
    source: 'operator',
    threadId: event.threadId,
    linkedEntities: event.linkedEntities ?? [],
    authorship: {
      author: submittedBy,
      surface: 'ingest',
      parentLineageId: options?.lineageParentId,
      existingLineageChain: options?.existingLineageChain,
    },
    payload: { ocid, headline: event.headline, insertedId: artifact.id, evidenceChunkIds: event.evidenceChunkIds ?? [] },
  })

  await emitRuntimeEvent({
    workspaceId,
    type: 'continuity.ingested',
    source: 'operator',
    governanceState: 'approved',
    executionState: 'completed',
    lineageId,
    payloadType: 'continuity.ingest',
    payload: {
      ocid,
      headline: event.headline,
      body: event.body,
      insertedId: artifact.id,
      threadId: event.threadId,
      linkedEntities: event.linkedEntities ?? [],
      evidenceChunkIds: event.evidenceChunkIds ?? [],
      sourceMode: event.sourceMode,
    },
  })

  const directory = parseMarkdownDirectory(artifact.text ?? '')
  const calendar = parseMarkdownCalendar(artifact.text ?? '')
  const rider = parseMarkdownRider(artifact.text ?? '')
  const operationCount = new Set([
    ...directory.departments,
    ...calendar.departments,
    ...rider.departments,
  ]).size

  await emitRuntimeEvent({
    workspaceId,
    type: SHOWTELA_RUNTIME_EVENT_TYPES.artifactUploaded,
    source: 'operator',
    governanceState: 'approved',
    executionState: 'completed',
    lineageId,
    payloadType: 'showtela.continuity-event',
    payload: {
      artifactId: artifact.id,
      insertedId: artifact.id,
      threadId: event.threadId,
      linkedEntities: event.linkedEntities ?? [],
      evidenceChunkIds: event.evidenceChunkIds ?? [],
      submittedBy,
      sourceMode: event.sourceMode,
      peopleCount: directory.people.length,
      operationsCount: operationCount,
      calendarCount: calendar.events.length,
    },
  })

  if (directory.people.length > 0) {
    await emitRuntimeEvent({
      workspaceId,
      type: SHOWTELA_RUNTIME_EVENT_TYPES.peopleHydrated,
      source: 'operator',
      governanceState: 'approved',
      executionState: 'completed',
      lineageId,
      payloadType: 'showtela.continuity-event',
      payload: {
        artifactId: artifact.id,
        insertedId: artifact.id,
        threadId: event.threadId,
        linkedEntities: event.linkedEntities ?? [],
        evidenceChunkIds: event.evidenceChunkIds ?? [],
        submittedBy,
        peopleCount: directory.people.length,
      },
    })
  }

  if (operationCount > 0) {
    await emitRuntimeEvent({
      workspaceId,
      type: SHOWTELA_RUNTIME_EVENT_TYPES.operationsHydrated,
      source: 'operator',
      governanceState: 'approved',
      executionState: 'completed',
      lineageId,
      payloadType: 'showtela.continuity-event',
      payload: {
        artifactId: artifact.id,
        insertedId: artifact.id,
        threadId: event.threadId,
        linkedEntities: event.linkedEntities ?? [],
        evidenceChunkIds: event.evidenceChunkIds ?? [],
        submittedBy,
        operationsCount: operationCount,
      },
    })
  }

  if (calendar.events.length > 0) {
    await emitRuntimeEvent({
      workspaceId,
      type: SHOWTELA_RUNTIME_EVENT_TYPES.calendarHydrated,
      source: 'operator',
      governanceState: 'approved',
      executionState: 'completed',
      lineageId,
      payloadType: 'showtela.continuity-event',
      payload: {
        artifactId: artifact.id,
        insertedId: artifact.id,
        threadId: event.threadId,
        linkedEntities: event.linkedEntities ?? [],
        evidenceChunkIds: event.evidenceChunkIds ?? [],
        submittedBy,
        calendarCount: calendar.events.length,
      },
    })
  }

  return { ok: true, eventId: event.id, lineageId }
}

export function extractInboxTitle(property: unknown) {
  return ((property as { title?: Array<{ plain_text?: string }> } | undefined)?.title ?? [])
    .map((item) => item.plain_text ?? '')
    .join('')
}

export function extractInboxRichText(property: unknown) {
  return ((property as { rich_text?: Array<{ plain_text?: string }> } | undefined)?.rich_text ?? [])
    .map((item) => item.plain_text ?? '')
    .join('')
}

export function extractInboxSelect(property: unknown) {
  return (property as { select?: { name?: string } } | undefined)?.select?.name ?? ''
}

export function resolveInboxDatabaseId() {
  return process.env.NOTION_CRUSADE_INBOX_DB_ID ?? process.env.NOTION_SHOWTELA_INBOX_DB_ID
}
