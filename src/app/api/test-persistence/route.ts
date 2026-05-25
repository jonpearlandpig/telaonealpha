import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const id = `test-${Date.now()}`
  const now = new Date().toISOString()

  const row = {
    id,
    workspace_id: 'tela-continuity-proof',
    thread_id: 'persistence-test',
    payload: 'continuity proof — first durable write',
    created_at: now,
    updated_at: now,
    provenance: {
      sourceType: 'test',
      sourceId: id,
      truthRank: 1,
      lineageRefs: [id],
      createdAt: now,
      updatedAt: now,
    },
  }

  console.log('[test-persistence] inserting row', id)

  let db: ReturnType<typeof getSupabaseServerClient>
  try {
    db = getSupabaseServerClient()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[test-persistence] client init failed:', msg)
    return NextResponse.json(
      { insertSuccess: false, readSuccess: false, error: `Supabase client init failed: ${msg}` },
      { status: 500 }
    )
  }

  const { error: insertError } = await db
    .from('durable_artifacts')
    .insert(row)

  if (insertError) {
    console.error('[test-persistence] insert failed:', insertError)
    return NextResponse.json(
      { insertSuccess: false, readSuccess: false, error: insertError.message, details: insertError },
      { status: 500 }
    )
  }

  console.log('[test-persistence] insert ok, reading back', id)

  const { data, error: readError } = await db
    .from('durable_artifacts')
    .select('*')
    .eq('id', id)
    .single()

  if (readError) {
    console.error('[test-persistence] read failed:', readError)
    return NextResponse.json(
      { insertSuccess: true, readSuccess: false, error: readError.message, details: readError },
      { status: 500 }
    )
  }

  console.log('[test-persistence] read ok', data)

  return NextResponse.json({
    insertSuccess: true,
    readSuccess: true,
    row: data,
  })
}
