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

  return <ShowTelaShell vm={vm} onCardAction={() => undefined} onPearlDrop={() => undefined} />
}
