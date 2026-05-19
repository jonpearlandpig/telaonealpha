import type { PersonEntity } from '@/lib/showtela/types'

const STATUS_COLOR: Record<string, string> = { low: '#4ADE80', medium: '#F59E0B', high: '#F87171' }

export function FluencyPartnersRail(
  props:
    | { people: PersonEntity[]; onPersonTap?: (name: string, role?: string) => void }
    | { items: Array<{ id: string; label?: string; name?: string; unresolvedCount: number; image: string }>; onPersonTap?: (name: string, role?: string) => void }
) {
  const onPersonTap = props.onPersonTap
  const people = 'people' in props ? props.people
    : props.items.map((i) => ({ id: i.id, name: i.label ?? i.name ?? 'Partner', unresolvedCount: i.unresolvedCount, role: 'Partner', avatar: i.image }))

  const overflow = people.length > 6 ? people.length - 6 : 0
  const visible = people.slice(0, 6)

  return (
    <section className="px-5 pb-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#5E5348]">Fluency Partners</h2>
          <span className="flex items-center gap-1 rounded-full bg-[#1A1712] px-2 py-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#4ADE80]" />
            <span className="text-[10px] font-medium text-[#E5DBC8]">{people.length} active</span>
          </span>
        </div>
        <button className="text-[11px] font-medium text-[#C89B2F]">View all</button>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {visible.map((p) => {
          const img = ('avatar' in p && p.avatar) ? p.avatar : undefined
          const pressure = ('pressure' in p && p.pressure) ? p.pressure as string : 'low'
          const role = ('role' in p && p.role) ? p.role : ('latest' in p && (p as {latest?: string}).latest) ? (p as {latest?: string}).latest! : 'Partner'

          return (
            <button key={p.id} className="flex min-w-[72px] flex-col items-center gap-1 p-0" onClick={() => onPersonTap?.(p.name, role)}>
              <div className="relative">
                <div className="h-[56px] w-[56px] overflow-hidden rounded-full border-[2px] border-[#1A1712] bg-[#1A1712] shadow-[0_4px_16px_rgba(0,0,0,0.25)]">
                  {img ? <img src={img} alt={p.name} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-base font-semibold text-[#F6DEAF]">{p.name.slice(0, 1)}</div>}
                </div>
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#F8F6F2]" style={{ backgroundColor: STATUS_COLOR[pressure] ?? '#4ADE80' }} />
              </div>
              <p className="text-center text-[12px] font-semibold leading-tight text-[#141210]">{p.name.split(' ')[0]}</p>
              <p className="text-center text-[10px] leading-tight text-[#6E6A63]">{role}</p>
            </button>
          )
        })}
        {overflow > 0 && (
          <button className="flex min-w-[72px] flex-col items-center gap-1 p-0">
            <div className="flex h-[56px] w-[56px] items-center justify-center rounded-full border-[2px] border-dashed border-[#D4C9B4] bg-[#F0EBE1]">
              <span className="text-[13px] font-semibold text-[#5E5348]">+{overflow}</span>
            </div>
            <p className="text-[12px] font-medium text-[#6E6A63]">More</p>
          </button>
        )}
      </div>
    </section>
  )
}
