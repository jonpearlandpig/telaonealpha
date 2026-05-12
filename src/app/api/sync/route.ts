import { NextResponse } from 'next/server'
import { fetchWikiContext } from '@/lib/notion'

export const revalidate = 60

export async function GET() {
  try {
    const payload = await fetchWikiContext()
    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 's-maxage=60, stale-while-revalidate=120',
      },
    })
  } catch (err) {
    console.error('[sync] error:', err)
    return NextResponse.json(
      { error: 'Sync failed', detail: String(err) },
      { status: 500 }
    )
  }
}
