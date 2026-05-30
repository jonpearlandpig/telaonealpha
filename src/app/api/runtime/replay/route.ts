import { NextResponse } from 'next/server'

import { SHOWTELA_WORKSPACE_ID } from '@/lib/showtela/runtimeIds'
import { getAllReplayEventsForWorkspace } from '@/lib/runtime/eventStore'
import { buildReplayRoutePayload } from '@/lib/runtime/replay/replayRoutePayload'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const workspaceId = url.searchParams.get('workspaceId')?.trim() || SHOWTELA_WORKSPACE_ID
    const events = await getAllReplayEventsForWorkspace(workspaceId)
    const payload = buildReplayRoutePayload({
      workspaceId,
      events,
    })

    return NextResponse.json(payload, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Replay observability failed' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
