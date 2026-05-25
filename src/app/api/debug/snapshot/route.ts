import { NextResponse } from 'next/server'
import { readShowTelaCacheRow } from '@/lib/supabase/operationalCache'

export const dynamic = 'force-dynamic'

export async function GET() {
  const row = await readShowTelaCacheRow()
  if (!row?.payload) {
    return NextResponse.json({
      rowExists: false,
      payloadSize: 0,
      activeOpsCount: 0,
      operationsCount: 0,
      source: null,
    }, { headers: { 'Cache-Control': 'no-store' } })
  }

  try {
    const parsed = JSON.parse(row.payload) as {
      activeOps?: unknown[]
      operations?: unknown[]
      source?: unknown
      runtimeSnapshotMeta?: unknown
    }

    return NextResponse.json({
      rowExists: true,
      payloadSize: row.payload.length,
      activeOpsCount: Array.isArray(parsed.activeOps) ? parsed.activeOps.length : 0,
      operationsCount: Array.isArray(parsed.operations) ? parsed.operations.length : 0,
      source: typeof parsed.source === 'string' ? parsed.source : null,
      updatedAt: row.updated_at ?? null,
      runtimeSnapshotMeta: parsed.runtimeSnapshotMeta ?? null,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({
      rowExists: true,
      payloadSize: row.payload.length,
      activeOpsCount: 0,
      operationsCount: 0,
      source: null,
      error: 'Snapshot payload is not valid JSON',
    }, { headers: { 'Cache-Control': 'no-store' } })
  }
}
