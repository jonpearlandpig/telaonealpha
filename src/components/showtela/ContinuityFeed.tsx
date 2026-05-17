import type { ActionType } from './FeedActionBar';
import { ContinuityCard } from './ContinuityCard';
import type { ContinuityFeedItem } from './types';

export function ContinuityFeed({ items, onCardAction }: { items: ContinuityFeedItem[]; onCardAction: (itemId: string, action: ActionType) => void }) {
  return <section className='space-y-3 px-3 pt-4'>{items.map((item)=><ContinuityCard key={item.id} item={item} onAction={(action)=>onCardAction(item.id, action)} />)}</section>
}
