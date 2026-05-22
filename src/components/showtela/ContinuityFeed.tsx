import type { ContinuityEvent } from '@/lib/showtela/types'
import { ContinuityCard } from './ContinuityCard'
import type { ActionType } from './FeedActionBar'
import type { ContinuityFeedItem } from './types'

type Props =
  | { feed: ContinuityEvent[]; onFeedTap?: (item: ContinuityEvent) => void }
  | { items: ContinuityFeedItem[]; onCardAction: (itemId: string, action: ActionType) => void; onFeedTap?: (item: ContinuityEvent) => void }

export function ContinuityFeed(props: Props) {
  const onFeedTap = props.onFeedTap
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
        {feed.map((item) => (
          <button key={item.id} className="w-full text-left" onClick={() => onFeedTap?.(item)}>
            <ContinuityCard item={item} />
          </button>
        ))}
        {feed.length === 0 && (
          <div className="rounded-[18px] border border-dashed border-[#D4C9B4] px-4 py-8 text-center">
            <p className="text-[13px] font-medium text-[#8B847B]">No live continuity events yet.</p>
            <p className="mt-1 text-[11px] text-[#A89880]">Authenticated operational updates will appear here.</p>
          </div>
        )}
      </div>
    </section>
  )
}
