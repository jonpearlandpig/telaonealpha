import { NextResponse } from 'next/server'

import { SHOWTELA_WORKSPACE_ID } from '@/lib/showtela/runtimeIds'
import { getAllReplayEventsForWorkspace } from '@/lib/runtime/eventStore'
import { buildRuntimeHealth } from '@/lib/runtime/observability/runtimeHealth'
import { buildGovernanceHealth } from '@/lib/runtime/observability/governanceHealth'
import { buildConstitutionalHealth } from '@/lib/runtime/observability/constitutionalHealth'
import { buildReplayHealth } from '@/lib/runtime/observability/replayHealth'
import { buildOrchestrationHealth } from '@/lib/runtime/observability/orchestrationHealth'
import { buildEscalationHealth } from '@/lib/runtime/observability/escalationHealth'
import { buildStabilityHealth } from '@/lib/runtime/observability/stabilityHealth'
import { inspectObservabilityTopology } from '@/lib/runtime/observability/observabilityTopology'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const workspaceId = url.searchParams.get('workspaceId')?.trim() || SHOWTELA_WORKSPACE_ID
    const events = await getAllReplayEventsForWorkspace(workspaceId)

    const runtimeHealth = buildRuntimeHealth({ workspaceId, events })
    const governanceHealth = buildGovernanceHealth(events)
    const constitutionalHealth = buildConstitutionalHealth(events)
    const replayHealth = buildReplayHealth({ workspaceId, events })
    const orchestrationHealth = buildOrchestrationHealth({ workspaceId, events })
    const escalationHealth = buildEscalationHealth(events)
    const stabilityHealth = buildStabilityHealth(events)
    const observabilityTopology = inspectObservabilityTopology({ workspaceId, events })

    return NextResponse.json({
      routeMode: 'read-only',
      replayAuthority: true,
      constitutionalBoundary: true,
      deterministicRestoration: replayHealth.deterministicRestoration,
      replayAuthorityMetadata: {
        routeMode: 'read-only',
        replayAuthority: true,
        constitutionalBoundary: true,
        authoritySource: 'replay-reconstruction',
        workspaceId,
        observedEventCount: events.length,
      },
      runtimeHealth,
      governanceHealth,
      constitutionalHealth,
      replayHealth,
      orchestrationHealth,
      escalationHealth,
      stabilityHealth,
      observabilityTopology,
    }, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Runtime health observability failed' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
