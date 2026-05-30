import { NextResponse } from 'next/server'

import { SHOWTELA_WORKSPACE_ID } from '@/lib/showtela/runtimeIds'
import { getAllReplayEventsForWorkspace } from '@/lib/runtime/eventStore'
import { buildContinuityReplay, renderContinuityReplayAnswer } from '@/lib/runtime/continuity/replay'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const workspaceId = url.searchParams.get('workspaceId')?.trim() || SHOWTELA_WORKSPACE_ID
    const query = url.searchParams.get('query')?.trim() || undefined
    const events = await getAllReplayEventsForWorkspace(workspaceId)
    const replay = buildContinuityReplay({
      workspaceId,
      events,
      query,
    })

    return NextResponse.json({
      ...replay,
      answer: renderContinuityReplayAnswer(replay),
    }, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Continuity replay reconstruction failed' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
