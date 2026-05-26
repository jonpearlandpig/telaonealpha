import { NextResponse } from 'next/server'
import { getOperationalProjection } from '@/lib/runtime/state/stateProjectionStore'
import { SHOWTELA_WORKSPACE_ID } from '@/lib/showtela/runtimeIds'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const projection = await getOperationalProjection(SHOWTELA_WORKSPACE_ID)
    return NextResponse.json({
      states: projection.states,
      blockers: projection.blockers,
      movement: projection.movement,
      readiness: projection.readiness,
      escalations: projection.escalations,
      groupedTopology: projection.groupedTopology,
      summary: projection.summary,
      derivedFromEventCount: projection.derivedFromEventCount,
      projectionVersion: projection.projectionVersion,
      generatedAt: projection.generatedAt,
      replayCursor: projection.replayCursor ?? null,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
