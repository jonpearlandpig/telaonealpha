import { NextRequest, NextResponse } from 'next/server'

import { getSession } from '@/lib/auth'
import { getAllReplayEventsForWorkspace } from '@/lib/runtime/eventStore'
import { SHOWTELA_WORKSPACE_ID } from '@/lib/showtela/runtimeIds'
import {
  buildReadinessReviewsFromEvents,
  createReadinessReview,
  isReadinessStatus,
  listReadinessReviews,
  normalizeReadinessEvidenceLinks,
  normalizeReadinessSections,
} from '@/lib/showtela/readiness'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const workspaceId = searchParams.get('workspaceId')?.trim() || SHOWTELA_WORKSPACE_ID
  const showTelaId = searchParams.get('showTelaId')?.trim() || undefined

  try {
    const [persisted, replayEvents] = await Promise.all([
      listReadinessReviews({ workspaceId, showTelaId }),
      getAllReplayEventsForWorkspace(workspaceId),
    ])

    const replayed = buildReadinessReviewsFromEvents(replayEvents, { showTelaId })

    return NextResponse.json({
      workspaceId,
      showTelaId,
      persisted,
      replayed,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json() as Record<string, unknown>
    const workspaceId = typeof body.workspaceId === 'string' && body.workspaceId.trim().length > 0
      ? body.workspaceId.trim()
      : SHOWTELA_WORKSPACE_ID
    const showTelaId = typeof body.showTelaId === 'string' ? body.showTelaId.trim() : ''
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const owner = typeof body.owner === 'string' && body.owner.trim().length > 0
      ? body.owner.trim()
      : session.name
    const status = body.status
    const reviewDate = typeof body.reviewDate === 'string' ? body.reviewDate.trim() : ''
    const scope = typeof body.scope === 'string' ? body.scope.trim() : ''

    if (!showTelaId || !title || !reviewDate || !scope || !isReadinessStatus(status)) {
      return NextResponse.json(
        { error: 'showTelaId, title, reviewDate, scope, and a valid readiness status are required.' },
        { status: 422 },
      )
    }

    const review = await createReadinessReview({
      workspaceId,
      showTelaId,
      title,
      description: typeof body.description === 'string' ? body.description : '',
      owner,
      status,
      reviewDate,
      scope,
      sections: normalizeReadinessSections(body.sections),
      evidenceLinks: normalizeReadinessEvidenceLinks(body.evidenceLinks),
      historySummary: typeof body.historySummary === 'string' ? body.historySummary : undefined,
    })

    return NextResponse.json({ ok: true, review }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
