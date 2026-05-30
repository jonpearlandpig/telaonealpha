import { NextResponse } from 'next/server'
import { hydrateRuntime } from '@/lib/runtime/runtimeHydration'
import { SHOWTELA_WORKSPACE_ID } from '@/lib/showtela/runtimeIds'

export const dynamic = 'force-dynamic'

export async function GET() {
  const state = await hydrateRuntime(SHOWTELA_WORKSPACE_ID)
  return NextResponse.json(
    { projection: state.operationalProjection },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
