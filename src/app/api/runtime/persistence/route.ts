import { NextResponse } from 'next/server'

import { inspectPersistenceHealth } from '@/lib/runtime/persistence/persistenceHealth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const health = await inspectPersistenceHealth()

    return NextResponse.json(health, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    return NextResponse.json(
      {
        persistenceHealthy: false,
        runtimeEventsAvailable: false,
        enforcementPersistenceAvailable: false,
        replayPersistenceReady: false,
        escalationPersistenceReady: false,
        degraded: true,
        warnings: [error instanceof Error ? error.message : 'Persistence observability failed'],
      },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
