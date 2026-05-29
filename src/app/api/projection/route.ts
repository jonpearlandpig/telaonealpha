import { NextResponse } from 'next/server'
import { getShowTelaHome } from '@/lib/showtela/hydration'
import { buildProjectionDiagnostic } from '@/lib/projection/diagnostics'
import { buildOperationalProjection } from '@/lib/projection/projectionBuilder'

export const dynamic = 'force-dynamic'

export async function GET() {
  const data = await getShowTelaHome()
  const projection = buildOperationalProjection(data)
  const diagnostic = buildProjectionDiagnostic(data, projection)
  return NextResponse.json(
    { projection, diagnostic },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
