import type { ContinuityEvent } from '@/lib/showtela/types'

export function ContinuityCard({ item }: { item: ContinuityEvent }) {
  return <article className='rounded-2xl bg-white p-4 shadow-sm'><h3 className='text-sm font-semibold'>{item.headline}</h3><p className='mt-1 text-sm text-[#5D5A56]'>{item.body}</p><p className='mt-2 text-xs'>{item.owner?.name ?? 'Unknown'} • {item.timestamp ?? ''}</p></article>
}
