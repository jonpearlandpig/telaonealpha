'use client'

type Pill = { id: string; label: string; count: string; active?: boolean }

export function UnresolvedRail({ items }: { items: Pill[] }) {
  return (
    <section className='px-6 pt-3'>
      <div className='flex gap-2 overflow-x-auto snap-x [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pb-1'>
        {items.map((item) => (
          <button
            key={item.id}
            className={`snap-start whitespace-nowrap rounded-full px-4 min-h-10 border text-xs tracking-[0.02em] ${item.active ? 'border-[var(--gold)] bg-[#FFF8E8] text-[#8A6611]' : 'border-[var(--border)] bg-white text-[var(--text-secondary)]'} active:scale-[0.99]`}
          >
            <span>{item.label}</span>
            <span className='ml-2 text-[10px] opacity-75'>{item.count}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
