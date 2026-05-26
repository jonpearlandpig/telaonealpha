import { NextResponse } from 'next/server'
import { hydrateRuntime } from '@/lib/runtime/runtimeHydration'
import { buildShowTelaVMFromHydratedState } from '@/lib/showtela/buildViewModel'
import { SHOWTELA_WORKSPACE_ID } from '@/lib/showtela/runtimeIds'

export const dynamic = 'force-dynamic'

export async function GET() {
  const state = await hydrateRuntime(SHOWTELA_WORKSPACE_ID)
  const vm = buildShowTelaVMFromHydratedState(state)
  return NextResponse.json({
    hasLiveData: Boolean(
      vm.activeOps.length ||
      vm.fluencyPartners.length ||
      vm.crusadeOperations.length ||
      vm.unresolved.length ||
      vm.feed.length
    ),
    source: vm.source,
    diagnosticState: vm.diagnosticState,
    activeOps: vm.activeOps.map(p => ({ name: p.name, role: p.latest })),
    fluencyPartners: vm.fluencyPartners.map(p => ({ name: p.name, role: p.latest })),
    operations: vm.crusadeOperations.map(o => ({ name: o.name, status: o.label })),
    unresolved: vm.unresolved.map(u => ({ title: u.title, severity: u.severity })),
    feed: vm.feed.slice(0, 5).map(e => ({ headline: e.title, owner: e.owner })),
  }, { headers: { 'Cache-Control': 'no-store' } })
}
