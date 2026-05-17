import { OperationalImage } from './OperationalImage';
import type { FluencyPartner } from './types';

export function FluencyPartnersRail({ items }: { items: FluencyPartner[] }) {
  return <section className='px-4 pt-3'><h2 className='mb-2 text-[12px] text-[#9A948B]'>Fluency Partners</h2><div className='flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>{items.map((item)=><article key={item.id} className='flex min-w-[132px] items-center gap-2 rounded-full border border-black/5 bg-white px-2 py-2 shadow-[0_6px_18px_rgba(17,17,17,0.04)]'><OperationalImage src={item.image} alt={item.label} className='h-8 w-8 rounded-full object-cover'/><div><p className='text-[12px] leading-4'>{item.label}</p><p className='text-[10px] text-[#9A948B]'>{item.unresolvedCount} unresolved</p></div></article>)}</div></section>
}
