import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const TEST_ID = 'debug-snapshot-probe'
const TEST_WORKSPACE = 'debug'

export async function GET() {
  const url = process.env.SUPABASE_URL ?? null
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? null

  if (!url || !key) {
    return NextResponse.json({
      write: 'skipped',
      read: 'skipped',
      rowFound: false,
      error: 'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set',
      projectUrl: url,
      serviceRoleKeyExists: Boolean(key),
    })
  }

  const db = createClient(url, key, { auth: { persistSession: false } })

  // ── WRITE ──────────────────────────────────────────────────────────────────
  let writeResult: 'success' | 'failed' = 'failed'
  let writeError: Record<string, unknown> | null = null

  const { error: upsertError } = await db
    .from('durable_artifacts')
    .upsert(
      [{ id: TEST_ID, workspace_id: TEST_WORKSPACE, payload: JSON.stringify({ probe: true, ts: new Date().toISOString() }) }],
      { onConflict: 'id' },
    )

  if (upsertError) {
    writeError = {
      code: upsertError.code,
      message: upsertError.message,
      details: (upsertError as { details?: string }).details ?? null,
      hint: (upsertError as { hint?: string }).hint ?? null,
    }
  } else {
    writeResult = 'success'
  }

  // ── READ ───────────────────────────────────────────────────────────────────
  let readResult: 'success' | 'failed' | 'skipped' = 'skipped'
  let readError: Record<string, unknown> | null = null
  let rowFound = false
  let rowPayload: unknown = null

  const { data, error: readErr } = await db
    .from('durable_artifacts')
    .select('id, workspace_id, payload')
    .eq('id', TEST_ID)
    .eq('workspace_id', TEST_WORKSPACE)
    .single()

  if (readErr) {
    readResult = 'failed'
    readError = {
      code: readErr.code,
      message: readErr.message,
      details: (readErr as { details?: string }).details ?? null,
      hint: (readErr as { hint?: string }).hint ?? null,
    }
  } else {
    readResult = 'success'
    rowFound = Boolean(data)
    rowPayload = data?.payload ? (() => { try { return JSON.parse(data.payload as string) } catch { return data.payload } })() : null
  }

  return NextResponse.json({
    write: writeResult,
    read: readResult,
    rowFound,
    writeError,
    readError,
    rowPayload,
    projectUrl: url,
    serviceRoleKeyExists: Boolean(key),
    serviceRoleKeyPrefix: key.slice(0, 12) + '…',
  })
}
