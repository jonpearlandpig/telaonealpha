import { NextResponse } from 'next/server'
import { hydrateRuntime } from '@/lib/runtime/runtimeHydration'
import { buildFocusEngine } from '@/lib/focus/focusBuilder'
import { buildBriefingEngine } from '@/lib/briefing/briefingBuilder'
import { buildReplayEngine } from '@/lib/replay/replayBuilder'
import { buildReplayDiagnostics } from '@/lib/replay/diagnostics'
import { SHOWTELA_WORKSPACE_ID } from '@/lib/showtela/runtimeIds'

export const dynamic = 'force-dynamic'

export async function GET() {
  const state = await hydrateRuntime(SHOWTELA_WORKSPACE_ID)
  const focusResult = buildFocusEngine(state.operationalProjection)
  const briefing = buildBriefingEngine({
    continuityFeed: state.continuityFeed,
    projection: state.operationalProjection,
    focusResult,
    unresolvedIds: state.unresolved.incompleteArtifacts,
  })
  const replay = buildReplayEngine({
    continuityFeed: state.continuityFeed,
    projection: state.operationalProjection,
    focusResult,
    currentReadiness: briefing.currentReadiness,
  })
  const diagnostics = buildReplayDiagnostics(replay, state.operationalProjection)

  return NextResponse.json(
    { replay, diagnostics },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
