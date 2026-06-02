import type { ContinuityEvent } from '@/lib/showtela/types'
import { ContinuityCard } from './ContinuityCard'
import type { ActionType } from './FeedActionBar'
import type { ContinuityFeedItem } from './types'

type Props =
  | { feed: ContinuityEvent[]; onFeedTap?: (item: ContinuityEvent) => void; onWhyTap?: (item: ContinuityEvent) => void }
  | { items: ContinuityFeedItem[]; onCardAction: (itemId: string, action: ActionType) => void; onFeedTap?: (item: ContinuityEvent) => void; onWhyTap?: (item: ContinuityEvent) => void }

export function ContinuityFeed(props: Props) {
  const onFeedTap = props.onFeedTap
  const onWhyTap = props.onWhyTap
  const feed = 'feed' in props ? props.feed
    : props.items.map((item) => ({
        id: item.id, headline: item.title, body: item.summary,
        timestamp: item.timestamp, image: item.image, tags: item.linkedEntities ?? [],
        owner: { id: item.owner, name: item.owner },
        telaWhy: item.telaWhy,
      }))

  return (
    <section className="px-5 pb-32">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5E5348]">Dispatches</h2>
      </div>
      <div className="divide-y divide-[#EDE8E1]">
        {feed.map((item) => (
          <article key={item.id} className="py-5">
            <button className="w-full text-left" onClick={() => onFeedTap?.(item)}>
              <ContinuityCard item={item} />
            </button>
            <button
              type="button"
              onClick={() => onWhyTap?.(item)}
              className="mt-2 rounded-full border border-[#D8C8AC] bg-[#FBF7EF] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7A6240]"
            >
              Why this matters
            </button>
          </article>
        ))}
        {feed.length === 0 && (
          <div className="rounded-[18px] border border-dashed border-[#D4C9B4] px-4 py-8 text-center">
            <p className="text-[13px] font-medium text-[#8B847B]">No updates have been saved yet.</p>
          </div>
        )}
      </div>
    </section>
  )
}
