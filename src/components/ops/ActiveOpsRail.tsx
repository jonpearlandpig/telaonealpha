import Link from 'next/link'
import type { OpsDepartment } from '@/types/feed'

const STATUS_STYLE: Record<OpsDepartment['status'], string> = {
  ACTIVE: 'opacity-100',
  BUILDING: 'opacity-90',
  EARLY: 'opacity-80',
  STANDBY: 'opacity-65',
}

const STATUS_DOT: Record<OpsDepartment['status'], string> = {
  ACTIVE: 'bg-[var(--gold)]',
  BUILDING: 'bg-[#D8A928]/80',
  EARLY: 'bg-[#D8A928]/60',
  STANDBY: 'bg-[#D8A928]/40',
}

export function ActiveOpsRail({ items, selected, onSelect }: { items: OpsDepartment[]; selected: string; onSelect: (name: string) => void }) {
  return <section className='px-5 pt-4'>
    <div className='flex gap-4 overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pb-2 [scroll-behavior:smooth]'>
      {items.map((d) => {
        const isSelected = selected === d.name
        return <button key={d.id} onClick={() => onSelect(d.name)} className={`snap-start min-w-[90px] text-center ${STATUS_STYLE[d.status]} active:scale-[0.99]`}>
          <div className={`mx-auto h-[74px] w-[74px] rounded-full border p-1 transition-colors ${isSelected ? 'border-[var(--gold)] bg-[#FFF8E8]' : d.active ? 'border-[#E9D6A1] bg-[#FFFBF2]' : 'border-[var(--border)] bg-white'}`}>
            <div className='h-16 w-16 rounded-full bg-white grid place-items-center text-xs font-medium'>{d.unresolvedCount}</div>
          </div>
          <Link href={`/entity/${encodeURIComponent(d.name.toLowerCase())}`} className='mt-2 text-[12px] leading-4 block'>{d.name}</Link>
          <p className='text-[10px] text-[var(--text-secondary)] inline-flex items-center gap-1'>
            <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[d.status]}`} />{d.status}
          </p>
        </button>
      })}
    </div>
  </section>
}
