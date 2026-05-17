import type { ContinuityEvent } from '@/lib/showtela/types'
import { OperationalImage } from './OperationalImage'

export function ContinuityCard({ item }: { item: ContinuityEvent }) {
  return <article className='rounded-[24px] border border-black/5 bg-white p-[18px] shadow-[0_6px_18px_rgba(17,17,17,0.04)]'><div className='flex gap-[14px]'><OperationalImage src={item.image ?? 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=900&auto=format&fit=crop'} alt={item.headline} className='h-[108px] w-[108px] rounded-2xl object-cover' /><div className='min-w-0 flex-1'><h3 className='text-[17px] font-semibold leading-[22px] tracking-[-0.4px]'>{item.headline}</h3><p className='mt-2 text-[15px] leading-[22px] text-[#5D5A56]'>{item.body}</p><p className='mt-2 text-[12px] text-[#8B847B]'>{item.owner?.name ?? 'Unknown'} • {(item.timestamp ?? '').toUpperCase()}</p></div><div className='text-right text-[12px] text-[#8B847B]'>{item.isNew ? '●' : ''}</div></div></article>
}
