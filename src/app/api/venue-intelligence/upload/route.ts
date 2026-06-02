import { NextResponse } from 'next/server'
import { ingestVenuePacket } from '@/lib/venue-intelligence/store'
import type { VenuePacketAsset } from '@/lib/venue-intelligence/types'
import { requireApiSession } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

function isTextLike(file: File) {
  const lower = file.name.toLowerCase()
  return file.type.startsWith('text/')
    || lower.endsWith('.md')
    || lower.endsWith('.txt')
    || lower.endsWith('.csv')
    || lower.endsWith('.json')
}

async function toVenueAsset(file: File): Promise<VenuePacketAsset> {
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    const bytes = Buffer.from(await file.arrayBuffer())
    return {
      name: file.name,
      mimeType: 'application/pdf',
      text: '',
      base64Data: bytes.toString('base64'),
    }
  }

  const text = isTextLike(file) ? await file.text() : ''
  return {
    name: file.name,
    mimeType: file.type || 'application/octet-stream',
    text,
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireApiSession(req)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const formData = await req.formData()
    const workspaceId = String(formData.get('workspaceId') ?? '').trim() || undefined
    const files = formData
      .getAll('files')
      .filter((entry): entry is File => entry instanceof File && entry.size > 0)

    if (files.length === 0) {
      return NextResponse.json({ error: 'Venue packet upload is required' }, { status: 422 })
    }

    const assets = await Promise.all(files.map((file) => toVenueAsset(file)))
    const result = await ingestVenuePacket({ workspaceId, assets })

    return NextResponse.json({
      ok: true,
      venueId: result.venue.id,
      venueName: result.venue.name,
      assessmentId: result.assessment.id,
      readinessScore: result.assessment.readinessScore,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
