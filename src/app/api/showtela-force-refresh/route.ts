import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { forceRefreshShowTelaFromNotion } from '@/lib/showtela/hydration'
import { getShowTelaEnvStatus } from '@/lib/showtela/env'
import { getShowTelaCacheSchemaCompatibility } from '@/lib/supabase/operationalCache'

export const dynamic = 'force-dynamic'

export async function POST() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = new Date().toISOString()
  const env = getShowTelaEnvStatus()
  if (env.missingRequired.length || env.invalidDatabaseIds.length) {
    console.error('[showtela-force-refresh] refusing refresh because live hydration env is invalid:', {
      missingRequired: env.missingRequired,
      invalidDatabaseIds: env.invalidDatabaseIds,
    })
    return NextResponse.json({
      ok: false,
      error: 'ShowTELA live hydration env is invalid',
      startedAt,
      completedAt: new Date().toISOString(),
      missingRequired: env.missingRequired,
      invalidDatabaseIds: env.invalidDatabaseIds,
      durableArtifacts: getShowTelaCacheSchemaCompatibility(),
    }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }

  const { data, summary, probes } = await forceRefreshShowTelaFromNotion()

  return NextResponse.json({
    ok: summary.connectedToNotion && Boolean(summary.supabaseWriteOk),
    startedAt,
    completedAt: new Date().toISOString(),
    cacheBypassed: true,
    source: data.source,
    diagnosticState: data.diagnosticState,
    summary,
    probes,
    durableArtifacts: getShowTelaCacheSchemaCompatibility(),
  }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function GET() {
  return NextResponse.json({ error: 'Use POST to force ShowTELA hydration refresh.' }, { status: 405 })
}
