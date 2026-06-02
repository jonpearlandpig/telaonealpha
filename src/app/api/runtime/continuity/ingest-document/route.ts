import { NextResponse } from 'next/server'
import { ingestDocumentContinuity } from '@/lib/continuity/documentIngest'
import type { ContinuityIngestionInput } from '@/lib/continuity/normalize-ingestion'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const input = (await req.json()) as ContinuityIngestionInput

    if (!input?.assetContents?.length && !input?.body?.trim()) {
      return NextResponse.json({ error: 'Document content or body is required' }, { status: 422 })
    }

    const result = await ingestDocumentContinuity(input)

    return NextResponse.json({
      ok: result.ok,
      eventId: result.eventId,
      lineageId: result.lineageId,
      hydration: result.hydration,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
