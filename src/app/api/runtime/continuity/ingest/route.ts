import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import type { ContinuityIngestionInput } from '@/lib/continuity/normalize-ingestion'
import { getShowTelaHome } from '@/lib/showtela/hydration'
import { ingestShowTelaContinuity } from '@/lib/showtela/runtimeContinuity'
import { writeShowTelaCache } from '@/lib/supabase/operationalCache'

export const dynamic = 'force-dynamic'

function isContinuityIngestionInput(value: unknown): value is ContinuityIngestionInput {
  if (!value || typeof value !== 'object') return false
  const mode = (value as { mode?: unknown }).mode
  return typeof mode === 'string'
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!isContinuityIngestionInput(payload)) {
    return NextResponse.json({ error: 'Invalid continuity payload' }, { status: 400 })
  }

  try {
    const baseData = await getShowTelaHome()
    const result = await ingestShowTelaContinuity({
      baseData,
      payload,
      submittedBy: session.name,
    })

    await writeShowTelaCache({ ...result.data, source: 'supabase', diagnosticState: 'persistence-connected' })

    return NextResponse.json({
      ok: true,
      constitutionalEventId: result.constitutionalEvent?.id ?? null,
      data: {
        ...result.data,
        source: 'supabase',
        diagnosticState: 'persistence-connected',
      },
      entityCount: result.entities.length,
      eventId: result.event.id,
      ocid: result.ocid,
      snapshotId: result.snapshot.id,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('[runtime/continuity/ingest]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
