import { ShowTelaShell } from '@/components/showtela/ShowTelaShell'
import { normalizeCrusadeData } from '@/components/showtela/normalizeCrusadeData'
import { getShowTelaHome } from '@/lib/showtela/hydration'

export const dynamic = 'force-dynamic'

export default async function ShowTelaHome() {
  const data = await getShowTelaHome()
  const vm = normalizeCrusadeData({
    feed: data.continuityFeed.map((event) => ({
      id: event.id,
      title: event.headline,
      status: event.pressure === 'high' ? 'unresolved' : 'resolved',
      priority: event.pressure ?? null,
      summary: event.body ?? '',
      owner: event.owner?.name ?? 'Ops Lead',
      updated: event.timestamp ?? new Date().toISOString(),
    })),
  })
  const env = process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'unknown'
  console.log('[ShowTELA]', `env=${env}`, `feed=${vm.feed.length}`, `activeOps=${vm.activeOps.length}`, `pressure=${vm.unresolvedPressure.unresolvedCount}`)

  return <ShowTelaShell vm={vm} onCardAction={() => undefined} onPearlDrop={() => undefined} env={env} commit={process.env.VERCEL_GIT_COMMIT_SHA ?? 'local'} buildTimestamp={new Date().toISOString()} />
}
