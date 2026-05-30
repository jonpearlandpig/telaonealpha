import { NextResponse } from 'next/server'
import { buildOperationalProjectionForWorkspace } from '@/lib/runtime/state/buildOperationalProjection'
import { buildFocusEngine } from '@/lib/focus/focusBuilder'
import { buildFocusDiagnostics } from '@/lib/focus/diagnostics'
import { SHOWTELA_WORKSPACE_ID } from '@/lib/showtela/runtimeIds'

export const dynamic = 'force-dynamic'

export async function GET() {
  const projection = await buildOperationalProjectionForWorkspace(SHOWTELA_WORKSPACE_ID)
  const focusResult = buildFocusEngine(projection, null)
  const diagnostics = buildFocusDiagnostics(projection, focusResult.allFocusItems)

  return NextResponse.json(
    { focus: focusResult, diagnostics },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
