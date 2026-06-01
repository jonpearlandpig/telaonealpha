import { NextRequest, NextResponse } from 'next/server'

import { getSession } from '@/lib/auth'
import { SHOWTELA_WORKSPACE_ID } from '@/lib/showtela/runtimeIds'
import {
  isReadinessStatus,
  normalizeReadinessEvidenceLinks,
  normalizeReadinessSections,
  updateReadinessReview,
} from '@/lib/showtela/readiness'

export const dynamic = 'force-dynamic'

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ reviewId: string }> },
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { reviewId } = await context.params
    const body = await req.json() as Record<string, unknown>
    const workspaceId = typeof body.workspaceId === 'string' && body.workspaceId.trim().length > 0
      ? body.workspaceId.trim()
      : SHOWTELA_WORKSPACE_ID

    const status = body.status
    if (status !== undefined && !isReadinessStatus(status)) {
      return NextResponse.json({ error: 'Invalid readiness status.' }, { status: 422 })
    }

    const review = await updateReadinessReview({
      workspaceId,
      reviewId,
      title: typeof body.title === 'string' ? body.title : undefined,
      description: typeof body.description === 'string' ? body.description : undefined,
      owner: typeof body.owner === 'string' ? body.owner : undefined,
      status: status === undefined ? undefined : status,
      reviewDate: typeof body.reviewDate === 'string' ? body.reviewDate : undefined,
      scope: typeof body.scope === 'string' ? body.scope : undefined,
      sections: body.sections === undefined ? undefined : normalizeReadinessSections(body.sections),
      evidenceLinks: body.evidenceLinks === undefined ? undefined : normalizeReadinessEvidenceLinks(body.evidenceLinks),
      historySummary: typeof body.historySummary === 'string' ? body.historySummary : undefined,
    })

    return NextResponse.json({ ok: true, review })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const status = /not found/i.test(message) ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
