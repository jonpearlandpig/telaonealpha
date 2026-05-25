import type { ContinuityEvent } from '@/lib/showtela/types'
import { ContinuityCard } from './ContinuityCard'
import type { ActionType } from './FeedActionBar'
import type { ContinuityFeedItem } from './types'

type Props = { feed: ContinuityEvent[] } | { items: ContinuityFeedItem[]; onCardAction: (itemId: string, action: ActionType) => void }

export function ContinuityFeed(props: Props) {
  const feed = 'feed' in props
    ? props.feed
    : props.items.map((item) => ({
        id: item.id,
        headline: item.title,
        body: item.rawTranscript ?? item.summary,
        summary: item.summary,
        rawTranscript: item.rawTranscript,
        timestamp: item.timestamp,
        owner: { id: item.owner, name: item.owner },
        pressure: item.pressure,
        classification: item.classification as ContinuityEvent['classification'],
        nextActions: item.nextActions,
        confidence: item.confidence,
        linkedEntities: item.linkedEntities,
      }))

  return (
    <section className="px-5 pb-16">
      <h2 className="pb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#84663A]">Continuity Feed</h2>
      <div className="space-y-3">
        {feed.map((item) => (
          <ContinuityCard key={item.id} item={item} />
        ))}
        {feed.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-[#D4C9B4] px-4 py-8 text-center">
            <p className="text-[13px] font-medium text-[#8B847B]">No continuity has entered the runtime.</p>
          </div>
        ) : null}
      </div>
    </section>
  )
}
