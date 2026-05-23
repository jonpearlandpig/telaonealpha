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
    <section className="pb-5">
      <div className="mb-3 flex items-center justify-between px-5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#5E5348]">Fluency Partners</h2>
        <button className="text-[11px] font-medium text-[#C89B2F]">View all</button>
      </div>
      <div className="flex gap-2.5 overflow-x-auto pl-5 pr-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {visible.map((p) => {
          const img = ('avatar' in p && p.avatar) ? p.avatar : undefined
          const role = ('role' in p && p.role) ? p.role : ''
          const unresolved = p.unresolvedCount ?? 0
          const hasName = !!p.name && p.name !== role
          const displayName = hasName ? p.name.split(' ')[0] : abbreviate(role)
          const initial = hasName ? p.name.slice(0, 1) : abbreviate(role).slice(0, 2)
          const pressure = ('pressure' in p && p.pressure) ? p.pressure : unresolved >= 2 ? 'high' : unresolved === 1 ? 'medium' : 'low'
          const hasPressure = pressure !== 'low'

          return (
            <button
              key={p.id}
              className="relative flex-shrink-0 overflow-hidden text-left"
              style={{
                width: '80px',
                height: '108px',
                borderRadius: '14px',
                boxShadow: hasPressure
                  ? '0 0 0 1.5px rgba(216,167,66,0.34), 0 6px 20px rgba(0,0,0,0.20)'
                  : '0 6px 20px rgba(0,0,0,0.14)',
              }}
              onClick={() => onPersonTap?.(p.name || role, role)}
            >
              {img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={img} alt="" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'linear-gradient(160deg, #2A2520, #1A1712)' }}>
                  <span className="font-semibold text-[#F8E1B0]" style={{ fontSize: hasName ? '28px' : '14px' }}>{initial}</span>
                </div>
              )}

              {hasPressure && (
                <div
                  className="absolute inset-0"
                  style={{ background: pressure === 'high' ? 'rgba(196,96,16,0.16)' : 'rgba(196,136,16,0.09)' }}
                />
              )}

              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(to top, rgba(10,8,6,0.90) 0%, rgba(10,8,6,0.26) 56%, transparent 100%)' }}
              />

              <div className="absolute bottom-0 left-0 right-0 px-2.5 pb-2.5">
                <p className="text-[12px] font-semibold leading-tight text-white">{displayName}</p>
                {role && (
                  <p className="mt-0.5 line-clamp-1 text-[9px] leading-tight text-white/55">{role}</p>
                )}
              </div>
            </button>
          )
        })}
        {overflow > 0 && (
          <button
            className="flex flex-shrink-0 flex-col items-center justify-center"
            style={{
              width: '80px',
              height: '108px',
              borderRadius: '14px',
              border: '1px dashed rgba(212,201,180,0.70)',
              background: '#F0EBE1',
            }}
          >
            <span className="text-[14px] font-semibold text-[#5E5348]">+{overflow}</span>
            <span className="mt-1 text-[9px] uppercase tracking-[0.12em] text-[#8B847B]">more</span>
          </button>
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
