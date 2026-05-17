import type { ContinuityEvent } from '@/lib/showtela/types'
import { ContinuityCard } from './ContinuityCard'
export function ContinuityFeed({ feed }: { feed: ContinuityEvent[] }) {
  return <section className='px-5 pb-28'><h2 className='pb-3 text-sm font-medium'>Continuity Feed</h2><div className='space-y-3'>{feed.map((item) => <ContinuityCard key={item.id} item={item} />)}</div></section>
}
