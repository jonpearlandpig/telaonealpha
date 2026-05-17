import type { ContinuityEvent } from '@/lib/showtela/types'
import { ContinuityCard } from './ContinuityCard'
export function ContinuityFeed({ feed }: { feed: ContinuityEvent[] }) {
  return <section className='px-7 pb-32 pt-5'><div className='mb-1 text-[10px] font-semibold text-green-600'>CONTINUITY FEED V2</div><h2 className='pb-3 text-[12px] uppercase tracking-[0.24em] text-[#8B847B]'>Continuity Feed</h2><div className='space-y-3'>{feed.map((item) => <ContinuityCard key={item.id} item={item} />)}</div></section>
}
