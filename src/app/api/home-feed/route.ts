import { NextResponse } from 'next/server'
import { getShowTelaHome } from '@/lib/showtela/hydration'
import { buildShowTelaVM } from '@/lib/showtela/buildViewModel'

export const dynamic = 'force-dynamic'

// Returns canonical Supabase snapshot only — never fetches Notion.
// Notion is ingested explicitly via /api/runtime/continuity/ingest.
export async function GET() {
  try {
    const data = await getShowTelaHome()
    const vm = buildShowTelaVM(data)
    console.log('[HOME_FEED_RESPONSE]', {
      source: vm.source,
      feedCount: vm.feed?.length,
      operationsCount: data.operations?.length,
    })
    return NextResponse.json(vm, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[home-feed] error:', msg)
    return NextResponse.json(
      { diagnosticState: 'persistence-failed', error: msg },
      { status: 500 }
    )
  }
}
