import { OperationalImage } from './OperationalImage';
import type { OperationEntity } from './types';

export function CrusadeOperationsRail({ items }: { items: OperationEntity[] }) {
  return <section className='px-7 pt-5'><h2 className='mb-2 text-[12px] uppercase tracking-[0.24em] text-[#8B847B]'>Crusade Operations</h2><div className='flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>{items.map((item)=><article key={item.id} className='relative min-w-[148px] rounded-[22px] bg-[#0E0E10] px-3 py-3 text-white shadow-[0_18px_50px_rgba(0,0,0,0.22)]'><span className='absolute inset-0 rounded-[22px] bg-[radial-gradient(circle_at_20%_20%,rgba(200,155,47,0.24),transparent_62%)]'/><div className='relative flex items-center gap-2'><OperationalImage src={item.image} alt={item.label} className='h-9 w-9 rounded-full object-cover ring-1 ring-[#C89B2F]/60'/><div><p className='text-[12px] text-[#E5DBC8]'>{item.label}</p><p className='text-[10px] text-[#B3A78E]'>{item.unresolvedCount} unresolved</p></div></div></article>)}</div></section>
}
