import { NextResponse } from 'next/server'

import { ensureUnresolvedPersistence } from '@/lib/showtela/statePersistence'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const result = await ensureUnresolvedPersistence()
    return NextResponse.json(result, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unresolved persistence enforcement failed' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
