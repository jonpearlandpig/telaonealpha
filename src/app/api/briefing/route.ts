import { NextResponse } from 'next/server'
import { hydrateRuntime } from '@/lib/runtime/runtimeHydration'
import { buildFocusEngine } from '@/lib/focus/focusBuilder'
import { buildBriefingEngine } from '@/lib/briefing/briefingBuilder'
import { buildBriefingDiagnostics } from '@/lib/briefing/diagnostics'
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
  const diagnostics = buildBriefingDiagnostics(briefing, state.operationalProjection)

  return NextResponse.json(
    { briefing, diagnostics },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
