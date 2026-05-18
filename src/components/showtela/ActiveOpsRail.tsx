import type { PersonEntity } from '@/lib/showtela/types'

const ROLE_LABELS: Record<string, string> = {
  jon: 'You', juan: 'Creator / Vision Lead',
  mags: 'Talent Buying', natalie: 'Director of Touring',
}

export function ActiveOpsRail(
  props: { people: PersonEntity[] } | { items: Array<{ id: string; name: string; latest?: string; unresolvedCount: number; image: string; updatesCount?: number }> }
) {
  const people = 'people' in props ? props.people
    : props.items.map((i) => ({ id: i.id, name: i.name, role: i.latest, unresolvedCount: i.unresolvedCount, updatesCount: i.updatesCount ?? 0, avatar: i.image }))

  return (
    <section className="px-5 pb-5 pt-1">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#5E5348]">Active Ops</h2>
          <span className="flex items-center gap-1 rounded-full bg-[#1A1712] px-2 py-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#4ADE80]" />
            <span className="text-[10px] font-medium text-[#E5DBC8]">{people.length} active now</span>
          </span>
        </div>
        <button className="text-[11px] font-medium text-[#C89B2F]">View all ›</button>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {people.map((p) => {
          const img = ('avatar' in p && p.avatar) ? p.avatar : undefined
          const unresolved = p.unresolvedCount ?? 0
          const updates = ('updatesCount' in p && p.updatesCount) ? p.updatesCount : 0
          const role = ROLE_LABELS[p.id] ?? ROLE_LABELS[p.name.toLowerCase().split(' ')[0]] ?? (('role' in p && p.role) ? p.role : '')
          const hasUnresolved = unresolved > 0
          const hasUpdates = updates > 0

          return (
            <button key={p.id} className="flex min-w-[80px] flex-col items-center gap-1.5 p-0">
              <div className="relative">
                <div
                  className="h-[68px] w-[68px] overflow-hidden rounded-full border-[2.5px] shadow-[0_0_0_3px_rgba(200,155,47,0.18),0_8px_24px_rgba(0,0,0,0.22)] bg-[#1A1712]"
                  style={{ borderColor: hasUnresolved ? '#F87171' : '#C89B2F' }}
                >
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-[#F8E1B0]">{p.name.slice(0, 1)}</div>
                  )}
                </div>
                <span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-[#F8F6F2] bg-[#4ADE80]" />
              </div>
              <p className="text-center text-[13px] font-semibold leading-tight text-[#141210]">{p.name.split(' ')[0]}</p>
              <p className="text-center text-[10px] leading-tight text-[#6E6A63]">{role}</p>
              <div className="flex flex-col items-center gap-0.5">
                {hasUpdates && <span className="rounded-full bg-[#E8F5E9] px-2 py-0.5 text-[10px] font-semibold text-[#166534]">{updates} updates</span>}
                {hasUnresolved && <span className="rounded-full bg-[#FEE2E2] px-2 py-0.5 text-[10px] font-semibold text-[#991B1B]">{unresolved} unresolved</span>}
              </div>
            </button>
          )
        })}
        <button className="flex min-w-[80px] flex-col items-center gap-1.5 p-0">
          <div className="flex h-[68px] w-[68px] items-center justify-center rounded-full border-[2px] border-dashed border-[#D4C9B4]">
            <span className="text-[24px] font-thin text-[#8B847B]">+</span>
          </div>
          <p className="text-[12px] font-medium text-[#8B847B]">Add</p>
        </button>
      </div>
    </section>
  )
}
