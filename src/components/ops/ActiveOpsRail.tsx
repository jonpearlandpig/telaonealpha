import type { OpsDepartment } from '@/types/feed'

const STATUS_STYLE: Record<OpsDepartment['status'], string> = {
  ACTIVE: 'opacity-100',
  BUILDING: 'opacity-90',
  EARLY: 'opacity-80',
  STANDBY: 'opacity-65',
}

export function ActiveOpsRail({ items, selected, onSelect }: { items: OpsDepartment[]; selected: string; onSelect: (name: string) => void }) {
  return <section className='px-6 pt-4'>
    <div className='flex gap-4 overflow-x-auto snap-x [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pb-2 [scroll-behavior:smooth]'>
      {items.map((d) => {
        const isSelected = selected === d.name
        return <button key={d.id} onClick={() => onSelect(d.name)} className={`snap-start min-w-[86px] text-center ${STATUS_STYLE[d.status]} active:scale-[0.99]`}>
          <div className={`mx-auto h-[72px] w-[72px] rounded-full border p-1 ${isSelected || d.active ? 'border-[var(--gold)] bg-[#FFF9EE]' : 'border-[var(--border)] bg-white'}`}>
            <div className='h-16 w-16 rounded-full bg-white grid place-items-center text-xs'>{d.unresolvedCount}</div>
          </div>
          <p className='mt-2 text-xs'>{d.name}</p>
          <p className='text-[10px] text-[var(--text-secondary)]'>{d.status}</p>
        </button>
      })}
    </div>
  </section>
}
