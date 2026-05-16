'use client'

type Pill = { id: string; label: string; count: string; active?: boolean }

export function UnresolvedRail({ items }: { items: Pill[] }) {
  return (
    <section className='px-5 pt-3'>
      <div className='flex gap-2.5 overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pb-1'>
        {items.map((item) => (
          <button
            key={item.id}
            className={`snap-start whitespace-nowrap rounded-full px-4 min-h-10 border text-[11px] tracking-[0.02em] ${item.active ? 'border-[#DFC17A] bg-[#FFF8E8] text-[#7E5B0F]' : 'border-[var(--border)] bg-white text-[var(--text-secondary)]'} active:scale-[0.99]`}
          >
            <span>{item.label}</span>
            <span className='ml-2 text-[10px] opacity-80'>{item.count}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
