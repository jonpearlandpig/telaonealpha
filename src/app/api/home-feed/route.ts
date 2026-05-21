import { NextResponse } from 'next/server'
import { refreshShowTelaFromNotion } from '@/lib/showtela/hydration'
import { buildShowTelaVM } from '@/lib/showtela/buildViewModel'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const data = await refreshShowTelaFromNotion()
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
