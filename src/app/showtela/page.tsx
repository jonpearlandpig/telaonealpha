import { ShowTelaRuntime } from '@/components/showtela/ShowTelaRuntime'
import { normalizeCrusadeData } from '@/components/showtela/normalizeCrusadeData'
import { getShowTelaHome } from '@/lib/showtela/hydration'

export const dynamic = 'force-dynamic'

export default async function ShowTelaHome() {
  const data = await getShowTelaHome()
  const vm = normalizeCrusadeData({ feed: data.continuityFeed.map((item) => ({ id: item.id, title: item.headline, status: item.isNew ? 'unresolved' : 'resolved', priority: item.pressure ?? null, summary: item.body ?? '', owner: item.owner?.name ?? 'Ops Lead', updated: item.timestamp ?? new Date().toISOString() })) })
  const commitHash = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local'
  const branch = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF ?? process.env.VERCEL_GIT_COMMIT_REF ?? 'main'
  const environment = process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'unknown'
  const buildTimestamp = new Date().toISOString()

  return (
    <main className='mx-auto min-h-screen max-w-md bg-[#F7F4EF] pb-28 text-[#13110D]'>
      <div className='fixed right-4 top-4 z-30 rounded-full border border-[#D7B57A]/50 bg-[#13110D] px-3 py-1 text-[10px] font-semibold tracking-[0.2em] text-[#F4DDAB] shadow-[0_10px_32px_rgba(0,0,0,0.25)]'>CANONICAL PREMIUM SHELL</div>
      <div className='fixed bottom-4 left-4 z-30 rounded-xl border border-[#C7AA73]/45 bg-[#13110D]/90 px-3 py-2 text-[10px] leading-tight text-[#F3E2BD] shadow-[0_10px_30px_rgba(0,0,0,0.3)]'>
        <div>commit {commitHash}</div>
        <div>branch {branch}</div>
        <div>env {environment}</div>
        <div>built {buildTimestamp}</div>
      </div>
      {data.dataMode === 'demo' && data.hydrationError ? <div className='mx-4 mt-4 rounded-xl border border-red-300/60 bg-red-100/70 px-3 py-2 text-[11px] text-red-900'>{data.hydrationError}</div> : null}
      {(environment !== 'production') ? <section className='mx-4 mt-3 rounded-xl border border-[#C7AA73]/50 bg-[#13110D]/85 px-3 py-2 text-[11px] text-[#F3E2BD]'><div className='mb-1 font-semibold tracking-[0.08em]'>CST SOURCE STATUS</div>{(data.sourceStatuses ?? []).map((s) => <div key={s.source}>{s.source}: {s.status} | rows:{s.rows} | type:{s.sourceType ?? 'unknown'}{s.reason ? ` | ${s.reason}` : ''}</div>)}</section> : null}
      <ShowTelaRuntime vm={vm} isDemoMode={data.dataMode === 'demo'} />
    </main>
  )
}
