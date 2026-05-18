import type { PersonEntity } from '@/lib/showtela/types'

type StoryItem = {
  id: string
  name: string
  role?: string
  unresolvedCount?: number
  updatesCount?: number
  pressure?: 'low' | 'medium' | 'high'
  avatar?: string
  latest?: string
}

function initials(name: string) {
  return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
}

function ringClass(item: StoryItem) {
  if ((item.unresolvedCount ?? 0) >= 3 || item.pressure === 'high') return 'from-[#B84B4B] to-[#7A2222]'
  if ((item.updatesCount ?? 0) > 0) return 'from-[#5C8ED8] to-[#2B5CA8]'
  if ((item.unresolvedCount ?? 0) > 0) return 'from-[#C4973A] to-[#8F6424]'
  return 'from-[#8A8578] to-[#5F5A4E]'
}

export function ActiveOpsRail(props: { people: PersonEntity[] } | { items: Array<{ id: string; name: string; latest?: string; unresolvedCount: number; image: string }> }) {
  const people: StoryItem[] = 'people' in props
    ? props.people
    : props.items.map((i) => ({ id: i.id, name: i.name, role: i.latest, unresolvedCount: i.unresolvedCount, updatesCount: 0 }))

  return (
    <section className='px-5 pb-5'>
      <h2 className='text-xs font-semibold uppercase tracking-[0.18em] text-[#84663A]'>Active Ops</h2>
      <div className='mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'>
        {people.map((p) => (
          <button key={p.id} className='group min-w-[88px] snap-start text-left'>
            <div className={`relative mx-auto flex h-[78px] w-[78px] items-center justify-center rounded-full bg-gradient-to-br p-[2.5px] ${ringClass(p)} shadow-[0_12px_28px_rgba(16,12,8,0.28)]`}>
              <div className='relative h-full w-full overflow-hidden rounded-full border border-white/15 bg-[#16120D]'>
                {p.avatar
                  ? <img src={p.avatar} alt={p.name} className='h-full w-full object-cover' />
                  : <div className='flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_35%_25%,#4B4438,#19140E)] text-lg font-semibold text-[#EAD8B6]'>{initials(p.name)}</div>}
                <span className='absolute right-0 top-0 rounded-full border border-[#16120D] bg-[#B84B4B] px-1 text-[10px] font-bold text-white'>{p.unresolvedCount ?? 0}</span>
              </div>
            </div>
            <p className='mt-2 truncate text-[13px] font-semibold text-[#18150F]'>{p.name}</p>
            <p className='truncate text-[11px] text-[#6C5C49]'>{p.latest ?? p.role ?? 'Updated now'}</p>
          </button>
        ))}
      </div>
    </section>
  )
}
