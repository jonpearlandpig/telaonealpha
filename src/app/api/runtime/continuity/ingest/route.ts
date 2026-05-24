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
    const incomingAssets = (payload as { assetContents?: unknown[] }).assetContents ?? []
    const incomingAsset0 = (incomingAssets[0] as { content?: string } | undefined)
    console.log('[TELA:TRACE] ingest route received', {
      mode: (payload as { mode?: string }).mode,
      assetContentsCount: incomingAssets.length,
      firstContentPreview: incomingAsset0?.content?.slice(0, 500) ?? null,
    })

    const baseData = await getShowTelaHome()
    console.log('[TELA:TRACE] baseData', {
      source: baseData.source,
      activeOpsCount: baseData.activeOps.length,
      operationsCount: baseData.operations.length,
    })

    const result = await ingestShowTelaContinuity({
      baseData,
      payload,
      submittedBy: session.name,
    })

    console.log('[TELA:TRACE] ingest result.data', {
      source: result.data.source,
      activeOpsCount: result.data.activeOps.length,
      operationsCount: result.data.operations.length,
      feedCount: result.data.continuityFeed.length,
      firstActiveOp: result.data.activeOps[0]?.name ?? null,
      firstOperation: result.data.operations[0]?.title ?? null,
    })

    try {
      await writeShowTelaCache({ ...result.data, source: 'supabase', diagnosticState: 'persistence-connected' })
    } catch (cacheErr) {
      console.error('[runtime/continuity/ingest] cache write non-fatal — continuing:', String(cacheErr))
    }

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
