import { ShowTelaRuntime } from '@/components/showtela/ShowTelaRuntime'
import { getShowTelaHome } from '@/lib/showtela/hydration'
import type { ShowTelaViewModel } from '@/components/showtela/types'

export const dynamic = 'force-dynamic'

export default async function ShowTelaHome() {
  const data = await getShowTelaHome()

  const vm: ShowTelaViewModel = {
    activeOps: data.activeOps.map((p) => ({
      id: p.id,
      name: p.name === 'TBD' ? '' : p.name,

      image: p.avatar ?? '',
      latest: p.role ?? '',
      unresolvedCount: p.unresolvedCount ?? 0,
    })),
    fluencyPartners: data.fluencyPartners.map((p) => ({
      id: p.id,
      name: p.name === 'TBD' ? '' : p.name,

      image: p.avatar ?? '',
      latest: p.role ?? '',
      unresolvedCount: p.unresolvedCount ?? 0,
    })),
    crusadeOperations: data.operations.map((o) => ({
      id: o.id,
      name: o.title,
      label: o.title,
      image: '',
      latest: o.latestMovement ?? '',
      unresolvedCount: o.unresolvedCount ?? 0,
    })),
    unresolvedPressure: {
      unresolvedCount: data.unresolved.length,
      overdueCount: data.unresolved.filter((u) => u.severity === 'high').length,
      blockedCount: data.unresolved.filter((u) => u.blocking).length,
      pendingApprovals: data.unresolved.filter((u) => u.severity === 'medium').length,
    },
    feed: data.continuityFeed.map((e) => ({
      id: e.id,
      timestamp: e.timestamp ?? '',
      title: e.headline,
      summary: e.body ?? '',
      owner: e.owner?.name ?? '',
      image: e.image ?? '',
      avatar: '',
      unresolved: e.isNew ?? false,
      linkedEntities: e.tags ?? [],
    })),
    continuityObjects: [],
    runtimeTimeline: data.runtimeTimeline,
  }

  const commitHash = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local'
  const branch = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF ?? 'main'

  return (
    <main className='mx-auto min-h-screen max-w-md bg-[#F8F6F2] pb-28 text-[#13110D]'>
      <div className='fixed right-4 top-4 z-30 rounded-full border border-[#D7B57A]/50 bg-[#13110D] px-3 py-1 text-[10px] font-semibold tracking-[0.2em] text-[#F4DDAB] shadow-[0_10px_32px_rgba(0,0,0,0.25)]'>CANONICAL PREMIUM SHELL</div>
      <div className='fixed bottom-20 left-4 z-30 rounded-xl border border-[#C7AA73]/45 bg-[#13110D]/90 px-3 py-2 text-[10px] leading-tight text-[#F3E2BD]'>
        <div>commit {commitHash}</div><div>branch {branch}</div>
      </div>
      <ShowTelaRuntime vm={vm} />
    </main>
  )
}
