import { getSupabaseServerClient } from './server'
import {
  SHOWTELA_RUNTIME_ARTIFACT_GROUP_ID,
  SHOWTELA_RUNTIME_THREAD_ID,
  SHOWTELA_SNAPSHOT_ID,
  SHOWTELA_WORKSPACE_ID,
} from '@/lib/showtela/runtimeContinuity'
import type { ShowTelaHomeData } from '@/lib/showtela/types'

type ShowTelaCacheDbRow = {
  id: string
  workspace_id: string
  payload: string | null
  updated_at?: string
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
    console.log('[operationalCache] readShowTelaCache hit — activeOps:', parsed.activeOps?.length ?? 0, 'ops:', parsed.operations?.length ?? 0, 'feed:', parsed.continuityFeed?.length ?? 0)
    return parsed
  } catch {
    console.error('[operationalCache] readShowTelaCache payload is not valid JSON')
    return null
  }
}

export async function readShowTelaCacheRow(): Promise<ShowTelaCacheDbRow | null> {
  const db = getSupabaseServerClient()
  const { data, error } = await db
    .from('durable_artifacts')
    .select('id, workspace_id, payload, updated_at')
    .eq('id', SHOWTELA_SNAPSHOT_ID)
    .eq('workspace_id', SHOWTELA_WORKSPACE_ID)
    .single()

  if (error) {
    console.error('[operationalCache] readShowTelaCache failed — code:', error.code, 'msg:', error.message)
    return null
  }
  return (data as ShowTelaCacheDbRow | null) ?? null
}

export async function writeShowTelaCache(data: ShowTelaHomeData): Promise<void> {
  const db = getSupabaseServerClient()
  const src: 'notion' | 'supabase' = data.source === 'supabase' ? 'supabase' : 'notion'
  const payloadStr = JSON.stringify({ ...data, source: src })
  const now = new Date().toISOString()

  console.log('[operationalCache] writeShowTelaCache — id:', SHOWTELA_SNAPSHOT_ID, 'workspace:', SHOWTELA_WORKSPACE_ID, 'activeOps:', data.activeOps.length, 'ops:', data.operations.length, 'payloadBytes:', payloadStr.length)

  const { error } = await db
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

  if (error) {
    throw new Error(
      `writeShowTelaCache upsert failed — code:${error.code} msg:${error.message} details:${(error as { details?: string }).details ?? ''} hint:${(error as { hint?: string }).hint ?? ''}`,
    )
  }

  // Immediate read-back: confirm the row is visible and payload is intact.
  const { data: verify, error: verifyError } = await db
    .from('durable_artifacts')
    .select('payload')
    .eq('id', SHOWTELA_SNAPSHOT_ID)
    .eq('workspace_id', SHOWTELA_WORKSPACE_ID)
    .single()

  if (verifyError || !verify?.payload) {
    throw new Error(`writeShowTelaCache verify failed — row not readable after upsert. code:${verifyError?.code ?? 'no-row'}`)
  }

  let verifiedData: ShowTelaHomeData | null = null
  try {
    verifiedData = JSON.parse(verify.payload) as ShowTelaHomeData
  } catch {
    throw new Error('writeShowTelaCache verify failed — payload not valid JSON after upsert')
  }

  const writtenActiveOps = verifiedData?.activeOps?.length ?? 0
  const writtenOps = verifiedData?.operations?.length ?? 0
  const writtenFeed = verifiedData?.continuityFeed?.length ?? 0

  console.log('[operationalCache] writeShowTelaCache verified —', {
    payloadBytes: verify.payload.length,
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
