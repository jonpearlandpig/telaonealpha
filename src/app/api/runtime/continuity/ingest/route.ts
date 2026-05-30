import { NextResponse } from 'next/server'
import { ingestCanonicalContinuity } from '@/lib/continuity/ingest-runtime'
import type { ContinuityIngestionInput } from '@/lib/continuity/normalize-ingestion'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const input = (await req.json()) as ContinuityIngestionInput

    if (!input?.body?.trim()) {
      return NextResponse.json({ error: 'Continuity body is required' }, { status: 422 })
    }

    const result = await ingestCanonicalContinuity(input)

    return NextResponse.json({
      ok: result.ok,
      eventId: result.eventId,
      lineageId: result.lineageId,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
