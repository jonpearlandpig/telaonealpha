import type { ContinuityEvent } from '@/lib/showtela/types'
import { ContinuityCard } from './ContinuityCard'
import type { ActionType } from './FeedActionBar'
import type { ContinuityFeedItem } from './types'

type Props = { feed: ContinuityEvent[] } | { items: ContinuityFeedItem[]; onCardAction: (itemId: string, action: ActionType) => void }

export function ContinuityFeed(props: Props) {
  const feed = 'feed' in props ? props.feed
    : props.items.map((item) => ({
        id: item.id, headline: item.title, body: item.summary,
        timestamp: item.timestamp, image: item.image, tags: item.linkedEntities ?? [],
        owner: { id: item.owner, name: item.owner },
      }))
  return (
    <section className="px-5 pb-32">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#5E5348]">Continuity Feed</h2>
      </div>
      <div className="divide-y divide-[#EAE4DA]">
        {feed.map((item) => <ContinuityCard key={item.id} item={item} />)}
      </div>
    </section>
  )
}
