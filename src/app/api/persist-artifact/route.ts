import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { persistDurableContinuity } from '@/lib/runtime/durableMemory'
import type { ArtifactRecord } from '@/lib/artifacts/artifactStore'
import type { EntityRecord } from '@/lib/entities/entityEngine'
import { SHOWTELA_WORKSPACE_ID } from '@/lib/showtela/runtimeIds'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json() as { artifacts: ArtifactRecord[]; entities: EntityRecord[] }
    const artifacts = body.artifacts ?? []
    const entities = body.entities ?? []
    if (artifacts.length === 0 && entities.length === 0) {
      return NextResponse.json({ ok: true, persisted: 0 })
    }
    await persistDurableContinuity(SHOWTELA_WORKSPACE_ID, { artifacts, entities, snapshots: [] })
    return NextResponse.json({ ok: true, persisted: artifacts.length })
  } catch (err) {
    // Non-fatal — client localStorage remains the fallback
    console.error('[persist-artifact]', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
