import { getSupabaseServerClient } from './server'
import {
  SHOWTELA_RUNTIME_ARTIFACT_GROUP_ID,
  SHOWTELA_RUNTIME_THREAD_ID,
  SHOWTELA_SNAPSHOT_ID,
  SHOWTELA_WORKSPACE_ID,
} from '@/lib/showtela/runtimeIds'
import type { ShowTelaHomeData } from '@/lib/showtela/types'

type ShowTelaCacheDbRow = {
  id: string
  workspace_id: string
  payload: string | null
  updated_at?: string
}

type SupabaseWriteError = {
  code?: string
  message?: string
  details?: string
  hint?: string
}

function isMissingColumnError(error: SupabaseWriteError | null | undefined) {
  const text = `${error?.message ?? ''} ${error?.details ?? ''} ${error?.hint ?? ''}`
  return /could not find the .* column|column .* does not exist|schema cache/i.test(text)
}

async function selectCacheRow(includeUpdatedAt: boolean): Promise<{ row: ShowTelaCacheDbRow | null; error: SupabaseWriteError | null }> {
  const db = getSupabaseServerClient()
  const select = includeUpdatedAt ? 'id, workspace_id, payload, updated_at' : 'id, workspace_id, payload'
  const { data, error } = await db
    .from('durable_artifacts')
    .select(select)
    .eq('id', SHOWTELA_SNAPSHOT_ID)
    .eq('workspace_id', SHOWTELA_WORKSPACE_ID)
    .single()

  return {
    row: (data as ShowTelaCacheDbRow | null) ?? null,
    error: (error as SupabaseWriteError | null) ?? null,
  }
}

export function getShowTelaCacheSchemaCompatibility() {
  return {
    table: 'durable_artifacts',
    compatible: true,
    requiredColumns: ['id', 'workspace_id', 'payload'],
    optionalColumns: ['thread_id', 'created_at', 'updated_at', 'provenance', 'file_name', 'mime_type', 'lineage_id', 'artifact_group_id'],
  }
}

export async function readShowTelaCache(): Promise<ShowTelaHomeData | null> {
  const row = await readShowTelaCacheRow()
  if (!row?.payload) return null

  try {
    const parsed = JSON.parse(row.payload) as ShowTelaHomeData
    console.log('[operationalCache] readShowTelaCache hit — activeOps:', parsed.activeOps?.length ?? 0, 'ops:', parsed.operations?.length ?? 0, 'feed:', parsed.continuityFeed?.length ?? 0, 'snapshotId:', parsed.runtimeSnapshotMeta?.snapshotId ?? null, 'workspace:', parsed.runtimeSnapshotMeta?.workspaceId ?? null, 'updatedAt:', parsed.runtimeSnapshotMeta?.updatedAt ?? row.updated_at ?? null, 'overwriteMode:', parsed.runtimeSnapshotMeta?.overwriteMode ?? null)
    return parsed
  } catch {
    console.error('[operationalCache] readShowTelaCache payload is not valid JSON')
    return null
  }
}

export async function readShowTelaCacheRow(): Promise<ShowTelaCacheDbRow | null> {
  const primary = await selectCacheRow(true)
  if (!primary.error) return primary.row
  if (isMissingColumnError(primary.error)) {
    const fallback = await selectCacheRow(false)
    if (!fallback.error) return fallback.row
    console.error('[operationalCache] readShowTelaCache fallback failed — code:', fallback.error?.code, 'msg:', fallback.error?.message)
    return null
  }
  console.error('[operationalCache] readShowTelaCache failed — code:', primary.error.code, 'msg:', primary.error.message)
  return null
}

async function upsertRichCacheRow(payloadStr: string, now: string) {
  const db = getSupabaseServerClient()
  return db
    .from('durable_artifacts')
    .upsert(
      [{
        id: SHOWTELA_SNAPSHOT_ID,
        workspace_id: SHOWTELA_WORKSPACE_ID,
        thread_id: SHOWTELA_RUNTIME_THREAD_ID,
        file_name: `${SHOWTELA_SNAPSHOT_ID}.json`,
        mime_type: 'application/json',
        artifact_group_id: SHOWTELA_RUNTIME_ARTIFACT_GROUP_ID,
        payload: payloadStr,
        created_at: now,
        updated_at: now,
        provenance: {
          sourceType: 'showtela_snapshot',
          sourceId: SHOWTELA_SNAPSHOT_ID,
          truthRank: 100,
          lineageRefs: [],
          artifactGroupId: SHOWTELA_RUNTIME_ARTIFACT_GROUP_ID,
          snapshotRefs: [SHOWTELA_SNAPSHOT_ID],
          createdAt: now,
          updatedAt: now,
        },
      }],
      { onConflict: 'id' },
    )
}

async function upsertMinimalCacheRow(payloadStr: string) {
  const db = getSupabaseServerClient()
  return db
    .from('durable_artifacts')
    .upsert(
      [{
        id: SHOWTELA_SNAPSHOT_ID,
        workspace_id: SHOWTELA_WORKSPACE_ID,
        payload: payloadStr,
      }],
      { onConflict: 'id' },
    )
}

async function verifyCachePayload(): Promise<string> {
  const db = getSupabaseServerClient()
  const { data: verify, error: verifyError } = await db
    .from('durable_artifacts')
    .select('payload')
    .eq('id', SHOWTELA_SNAPSHOT_ID)
    .eq('workspace_id', SHOWTELA_WORKSPACE_ID)
    .single()

  if (verifyError || !verify?.payload) {
    throw new Error(`writeShowTelaCache verify failed — row not readable after upsert. code:${verifyError?.code ?? 'no-row'}`)
  }

  return verify.payload
}

export async function writeShowTelaCache(data: ShowTelaHomeData): Promise<void> {
  const src: 'notion' | 'supabase' = data.source === 'supabase' ? 'supabase' : 'notion'
  const payloadStr = JSON.stringify({ ...data, source: src })
  const now = new Date().toISOString()

  console.log('[operationalCache] writeShowTelaCache — id:', SHOWTELA_SNAPSHOT_ID, 'workspace:', SHOWTELA_WORKSPACE_ID, 'activeOps:', data.activeOps.length, 'ops:', data.operations.length, 'payloadBytes:', payloadStr.length)

  let writeMode: 'rich' | 'minimal' = 'rich'
  const richResult = await upsertRichCacheRow(payloadStr, now)
  let error = richResult.error as SupabaseWriteError | null
  if (error && isMissingColumnError(error)) {
    writeMode = 'minimal'
    console.warn('[operationalCache] rich cache upsert failed on optional-column schema; retrying minimal payload write')
    const fallback = await upsertMinimalCacheRow(payloadStr)
    error = fallback.error as SupabaseWriteError | null
  }

  if (error) {
    throw new Error(
      `writeShowTelaCache upsert failed — code:${error.code} msg:${error.message} details:${(error as { details?: string }).details ?? ''} hint:${(error as { hint?: string }).hint ?? ''}`,
    )
  }

  let verifiedData: ShowTelaHomeData | null = null
  try {
    verifiedData = JSON.parse(await verifyCachePayload()) as ShowTelaHomeData
  } catch {
    throw new Error('writeShowTelaCache verify failed — payload not valid JSON after upsert')
  }

  const writtenActiveOps = verifiedData?.activeOps?.length ?? 0
  const writtenOps = verifiedData?.operations?.length ?? 0
  const writtenFeed = verifiedData?.continuityFeed?.length ?? 0

  console.log('[operationalCache] writeShowTelaCache verified —', {
    payloadBytes: payloadStr.length,
    writeMode,
    writtenActiveOps,
    writtenOps,
    writtenFeed,
    expectedActiveOps: data.activeOps.length,
    expectedOps: data.operations.length,
  })

  if (writtenActiveOps !== data.activeOps.length || writtenOps !== data.operations.length) {
    throw new Error(
      `writeShowTelaCache mismatch — activeOps written:${writtenActiveOps} expected:${data.activeOps.length} ops written:${writtenOps} expected:${data.operations.length}`,
    )
  }
}
