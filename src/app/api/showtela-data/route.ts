import { NextResponse } from 'next/server'
import { hydrateRuntime } from '@/lib/runtime/runtimeHydration'
import { buildShowTelaVMFromHydratedState } from '@/lib/showtela/buildViewModel'
import { SHOWTELA_WORKSPACE_ID } from '@/lib/showtela/runtimeIds'
import { requireApiSession } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const auth = await requireApiSession(req)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { searchParams } = new URL(req.url)
  const workspaceId = searchParams.get('workspaceId')?.trim() || searchParams.get('workspace')?.trim() || SHOWTELA_WORKSPACE_ID
  const state = await hydrateRuntime(workspaceId)
  const vm = buildShowTelaVMFromHydratedState(state)
  const readinessReviews = vm.readinessReviews ?? []
  return NextResponse.json({
    workspaceId,
    hasLiveData: Boolean(
      vm.activeOps.length ||
      vm.fluencyPartners.length ||
      vm.crusadeOperations.length ||
      vm.unresolved.length ||
      vm.feed.length ||
      readinessReviews.length
    ),
    source: vm.source,
    diagnosticState: vm.diagnosticState,
    activeOps: vm.activeOps.map(p => ({ name: p.name, role: p.latest })),
    fluencyPartners: vm.fluencyPartners.map(p => ({ name: p.name, role: p.latest })),
    operations: vm.crusadeOperations.map(o => ({ name: o.name, status: o.label })),
    unresolved: vm.unresolved.map(u => ({ title: u.title, severity: u.severity })),
    readinessReviews: readinessReviews.map((review) => ({
      reviewId: review.reviewId,
      title: review.title,
      status: review.status,
      reviewDate: review.reviewDate,
    })),
    feed: vm.feed.slice(0, 5).map(e => ({ headline: e.title, owner: e.owner })),
    vm,
  }, { headers: { 'Cache-Control': 'no-store' } })
}
