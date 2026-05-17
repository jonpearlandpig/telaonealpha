import { ShowTelaRuntime } from '@/components/showtela/ShowTelaRuntime'
import { normalizeCrusadeData } from '@/components/showtela/normalizeCrusadeData'
import { getShowTelaHome } from '@/lib/showtela/hydration'

export const dynamic = 'force-dynamic'

export default async function ShowTelaHome() {
  const data = await getShowTelaHome()
  const vm = normalizeCrusadeData({ feed: data.continuityFeed.map((item) => ({ id: item.id, title: item.headline, status: item.isNew ? 'unresolved' : 'resolved', priority: item.pressure ?? null, summary: item.body ?? '', owner: item.owner?.name ?? 'Ops Lead', updated: item.timestamp ?? new Date().toISOString() })) })
  const commitHash = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local'
  const branch = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF ?? process.env.VERCEL_GIT_COMMIT_REF ?? 'main'

  return (
    <main className='mx-auto min-h-screen max-w-md bg-[#F7F4EF] pb-28 text-[#13110D]'>
      <div className='fixed right-4 top-4 z-30 rounded-full border border-[#D7B57A]/50 bg-[#13110D] px-3 py-1 text-[10px] font-semibold tracking-[0.2em] text-[#F4DDAB] shadow-[0_10px_32px_rgba(0,0,0,0.25)]'>CANONICAL PREMIUM SHELL</div>
      <div className='fixed bottom-4 left-4 z-30 rounded-xl border border-[#C7AA73]/45 bg-[#13110D]/90 px-3 py-2 text-[10px] leading-tight text-[#F3E2BD] shadow-[0_10px_30px_rgba(0,0,0,0.3)]'>
        <div>commit {commitHash}</div>
        <div>branch {branch}</div>
      </div>
      <ShowTelaRuntime vm={vm} />
    </main>
  )
}
