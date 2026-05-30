import { NextResponse } from 'next/server'
import { hydrateRuntime } from '@/lib/runtime/runtimeHydration'
import { buildShowTelaVMFromHydratedState } from '@/lib/showtela/buildViewModel'
import { SHOWTELA_WORKSPACE_ID } from '@/lib/showtela/runtimeIds'

export const dynamic = 'force-dynamic'

// Returns sovereign runtime state — never fetches Notion.
// Notion is ingested explicitly via /api/runtime/continuity/ingest.
export async function GET() {
  try {
    const state = await hydrateRuntime(SHOWTELA_WORKSPACE_ID)
    const vm = buildShowTelaVMFromHydratedState(state)
    console.log('[HOME_FEED_RESPONSE]', {
      source: vm.source,
      feedCount: vm.feed?.length,
      operationsCount: vm.crusadeOperations?.length,
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
