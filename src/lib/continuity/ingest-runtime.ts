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
import { SHOWTELA_WORKSPACE_ID } from '@/lib/showtela/runtimeIds'

export async function ingestCanonicalContinuity(
  input: ContinuityIngestionInput,
  options?: NormalizeContinuityIngestionOptions,
): Promise<{ ok: true; eventId: string; lineageId: string }> {
  const timestamp = new Date().toISOString()
  const submittedBy = options?.author ?? input.owner ?? 'Operations'

  const fileContents = (input.assetContents ?? [])
    .filter(f => f.content.trim().length > 0)
    .map(f => f.content.trim())

  const firstAssetName = input.assetContents?.[0]?.name ?? input.assetNames?.[0]
  const headlineSeed = input.headline?.trim() || input.body?.trim() || firstAssetName || 'continuity'
  const ocid = createContinuityOcid(headlineSeed, timestamp)

  const event = await normalizeContinuityIngestionWithLLM(input, {
    author: submittedBy,
    continuityObjectId: ocid,
    eventId: ocid,
    existingLineageChain: options?.existingLineageChain,
    lineageParentId: options?.lineageParentId,
    timestamp,
  })

  const lineageId = event.lineageRef?.lineageId ?? ocid

  // Persist durable artifact + entities — hydrateRuntime() reads these via loadDurableContinuity()
  const constitutionalEvent = await tryCreateContinuityEventRecord({ event, ocid, submittedBy })
  const artifact = createRuntimeContinuityArtifact({ constitutionalEvent, event, ocid, fileContents })
  const entities = extractContinuityEntities(event, artifact)

  try {
    await persistDurableContinuity(SHOWTELA_WORKSPACE_ID, { artifacts: [artifact], entities, snapshots: [] })
  } catch (err) {
    console.error('[runtimeIngest] durable persistence non-fatal:', String(err))
  }

  // Emit to runtime_events via bootstrap persistence handler
  bootstrapRuntimeSpine()

  await orchestrateRuntimeAction({
    workspaceId: SHOWTELA_WORKSPACE_ID,
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
    payload: { ocid, headline: event.headline, insertedId: artifact.id },
  })

  await emitRuntimeEvent({
    workspaceId: SHOWTELA_WORKSPACE_ID,
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
      sourceMode: event.sourceMode,
    },
  })

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
