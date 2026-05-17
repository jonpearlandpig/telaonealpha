import type { ContinuityEvent } from '@/lib/showtela/types'
import { ContinuityCard } from './ContinuityCard'
import type { ActionType } from './FeedActionBar'
import type { ContinuityFeedItem } from './types'

type Props = { feed: ContinuityEvent[] } | { items: ContinuityFeedItem[]; onCardAction: (itemId: string, action: ActionType) => void }

export function ContinuityFeed(props: Props) {
  const feed = 'feed' in props ? props.feed : props.items.map((item) => ({ id: item.id, headline: item.title, body: item.summary, timestamp: item.timestamp, owner: { id: item.owner, name: item.owner } }))
  return <section className='px-5 pb-32'><h2 className='pb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#84663A]'>Continuity Feed</h2><div className='space-y-3'>{feed.map((item) => <ContinuityCard key={item.id} item={item} />)}</div></section>
}
