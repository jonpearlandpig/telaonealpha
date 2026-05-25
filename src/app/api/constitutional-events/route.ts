import { NextResponse } from 'next/server'

import { createConstitutionalEvent, validateConstitutionalEventPayload } from '@/lib/constitutional/create-event'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const payload = validateConstitutionalEventPayload(body)
    const event = await createConstitutionalEvent(payload)
    return NextResponse.json({ event }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Constitutional event creation failed' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
