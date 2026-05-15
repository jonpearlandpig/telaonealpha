import type { OpsDepartment } from '@/types/feed'

export function ActiveOpsRail({ items }: { items: OpsDepartment[] }) {
  return <section className='px-6 pt-4'><div className='flex gap-4 overflow-x-auto snap-x [scrollbar-width:none] pb-2'>{items.map((d)=><article key={d.id} className='snap-start min-w-[84px] text-center'><div className={`mx-auto h-[72px] w-[72px] rounded-full border-2 p-1 ${d.active?'border-[var(--gold)]':'border-[var(--border)]'}`}><div className='h-16 w-16 rounded-full bg-white grid place-items-center text-xs'>{d.unresolvedCount}</div></div><p className='mt-2 text-xs'>{d.name}</p><p className='text-[10px] text-[var(--text-secondary)]'>{d.latest}</p></article>)}</div></section>
}
