import { OperationalImage } from './OperationalImage';
import type { ActiveOp } from './types';

export function ActiveOpsRail({ items }: { items: ActiveOp[] }) {
  return <section className='px-4 pt-4'><h2 className='mb-2 text-[12px] text-[#9A948B]'>Active Ops</h2><div className='flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch] [overscroll-behavior-x:contain] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>{items.map((item)=><article key={item.id} className='w-[76px] shrink-0 snap-start text-center'><button className='relative h-[72px] w-[72px] rounded-full border-[3px] border-[#C89B2F] p-[2px] shadow-[0_6px_18px_rgba(17,17,17,0.04)] active:scale-[0.96]'><OperationalImage src={item.image} alt={item.name} className='h-full w-full rounded-full object-cover'/><span className='absolute -right-1 top-0 grid h-5 min-w-5 place-items-center rounded-full bg-[#C89B2F] px-1 text-[10px] font-semibold text-white'>{item.unresolvedCount}</span></button><p className='mt-1 text-[12px] font-medium leading-4'>{item.name}</p><p className='text-[10px] leading-3 text-[#9A948B]'>{item.latest}</p></article>)}</div></section>
}
