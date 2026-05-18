import type { ContinuityFeedEvent } from '@/lib/showtela/types'

export function ContinuityCard({ item }: { item: ContinuityFeedEvent }) {
  return <article className='rounded-[1.35rem] border border-[#E8DCC4]/85 bg-[linear-gradient(152deg,#FFFDF7_0%,#F6EBDD_100%)] p-4 shadow-[0_18px_34px_rgba(24,19,13,0.11)]'><h3 className='text-[15px] font-semibold leading-tight text-[#18150F]'>{item.headline}</h3><p className='mt-2 text-sm leading-relaxed text-[#5E5142]'>{item.body}</p><p className='mt-3 text-[11px] font-medium uppercase tracking-[0.14em] text-[#8A7049]'>{item.owner?.name ?? 'Unknown'} • {item.timestamp ?? ''}</p></article>
}
