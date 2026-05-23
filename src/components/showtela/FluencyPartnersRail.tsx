import type { PersonEntity } from '@/lib/showtela/types'

function abbreviate(role: string): string {
  const map: Record<string, string> = {
    'tour manager': 'TM', 'production manager': 'PM', 'stage manager': 'SM',
    'costume designer': 'COST', 'costumes': 'COST',
    'transportation': 'TRANS', 'lighting designer': 'LX', 'lighting': 'LX',
    'audio': 'A1', 'sound designer': 'A1', 'foh': 'FOH',
    'marketing': 'MKT', 'ticketing': 'TKT', 'finance': 'FIN',
    'director of touring': 'DOT', 'director of operations': 'DOO',
    'technology specialist': 'TECH', 'talent buying specialist': 'TBS',
    'wardrobe': 'WRD', 'choreographer': 'CHOR', 'music director': 'MD',
    'set designer': 'SET', 'director': 'DIR', 'creative producer': 'CP',
  }
  const lower = role.toLowerCase()
  for (const [key, abbr] of Object.entries(map)) {
    if (lower.includes(key)) return abbr
  }
  return role.slice(0, 4).toUpperCase()
}

export function FluencyPartnersRail(
  props:
    | { people: PersonEntity[]; onPersonTap?: (name: string, role?: string) => void }
    | { items: Array<{ id: string; label?: string; name?: string; unresolvedCount: number; image: string; latest?: string }>; onPersonTap?: (name: string, role?: string) => void }
) {
  const onPersonTap = props.onPersonTap
  const people = 'people' in props ? props.people
    : props.items.map((i) => ({
        id: i.id,
        name: i.label ?? i.name ?? '',
        unresolvedCount: i.unresolvedCount,
        role: i.latest ?? '',
        avatar: i.image,
      }))

  const overflow = people.length > 6 ? people.length - 6 : 0
  const visible = people.slice(0, 6)

  return (
    <section className="pb-6">
      <div className="mb-3 flex items-center justify-between px-5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#5E5348]">Fluency Partners</h2>
        <button className="text-[11px] font-medium text-[#C89B2F]">View all</button>
      </div>
      <div className="flex gap-5 overflow-x-auto pl-5 pr-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {visible.map((p) => {
          const img = ('avatar' in p && p.avatar) ? p.avatar : undefined
          const role = ('role' in p && p.role) ? p.role : ''
          const unresolved = p.unresolvedCount ?? 0
          const hasName = !!p.name && p.name !== role
          const displayName = hasName ? p.name.split(' ')[0] : abbreviate(role)
          const initial = hasName ? p.name.slice(0, 1) : abbreviate(role).slice(0, 2)
          const pressure = ('pressure' in p && p.pressure) ? p.pressure : unresolved >= 2 ? 'high' : unresolved === 1 ? 'medium' : 'low'
          const ringBg = pressure === 'high'
            ? 'linear-gradient(135deg, #8A6040 0%, #C4946A 100%)'
            : pressure === 'medium'
              ? 'linear-gradient(135deg, #B89A52 0%, #D8C080 100%)'
              : 'rgba(180,168,148,0.45)'

          return (
            <button
              key={p.id}
              className="flex w-[60px] flex-shrink-0 flex-col items-center gap-1.5 p-0"
              onClick={() => onPersonTap?.(p.name || role, role)}
            >
              <div
                className="flex h-[52px] w-[52px] items-center justify-center rounded-full p-[2px] shadow-[0_6px_18px_rgba(17,17,17,0.08)]"
                style={{ background: ringBg }}
              >
                <div className="h-full w-full overflow-hidden rounded-full" style={{ background: '#F2EDE4' }}>
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center" style={{ background: '#1C1814' }}>
                      <span className="font-semibold text-[#F0DEB8]" style={{ fontSize: hasName ? '18px' : '10px' }}>{initial}</span>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-center text-[11px] font-medium leading-tight text-[#5E5348]">{displayName}</p>
            </button>
          )
        })}

        {overflow > 0 && (
          <div className="flex w-[60px] flex-shrink-0 flex-col items-center gap-1.5">
            <div
              className="flex h-[52px] w-[52px] items-center justify-center rounded-full"
              style={{ border: '1.5px dashed rgba(180,168,148,0.55)', background: '#F0EBE1' }}
            >
              <span className="text-[13px] font-semibold text-[#5E5348]">+{overflow}</span>
            </div>
            <span className="text-[9px] uppercase tracking-[0.12em] text-[#8B847B]">more</span>
          </div>
        )}

        {people.length === 0 && (
          <div className="rounded-[18px] border border-dashed border-[#D4C9B4] px-4 py-4 text-center" style={{ minWidth: '200px' }}>
            <p className="text-[13px] font-medium text-[#8B847B]">No fluency partners yet.</p>
          </div>
        )}
      </div>
    </section>
  )
}
