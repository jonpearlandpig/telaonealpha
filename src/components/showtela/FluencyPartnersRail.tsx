import type { PersonEntity } from '@/lib/showtela/types'

const STATUS_COLOR: Record<string, string> = { low: '#4ADE80', medium: '#F59E0B', high: '#F87171' }

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
    <section className="px-5 pb-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#5E5348]">Fluency Partners</h2>
        <button className="text-[11px] font-medium text-[#C89B2F]">View all</button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {visible.map((p) => {
          const img = ('avatar' in p && p.avatar) ? p.avatar : undefined
          const pressure = ('pressure' in p && p.pressure) ? p.pressure as string : 'low'
          const role = ('role' in p && p.role) ? p.role : ''
          const hasName = !!p.name && p.name !== role
          const displayName = hasName ? p.name.split(' ')[0] : abbreviate(role)
          const initial = hasName ? p.name.slice(0, 1) : abbreviate(role).slice(0, 2)

          return (
            <button key={p.id} className="flex w-[48px] flex-shrink-0 flex-col items-center gap-1 p-0" onClick={() => onPersonTap?.(p.name || role, role)}>
              <div className="relative">
                <div className="h-[32px] w-[32px] overflow-hidden rounded-full border-[1.5px] border-[#1A1712] bg-[#1A1712] shadow-[0_2px_8px_rgba(0,0,0,0.20)]">
                  {img
                    ? <img src={img} alt={p.name} className="h-full w-full object-cover object-center" />
                    : <div className="flex h-full w-full items-center justify-center font-semibold text-[#F6DEAF]" style={{ fontSize: hasName ? '12px' : '8px' }}>{initial}</div>
                  }
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-[#F8F6F2]" style={{ backgroundColor: STATUS_COLOR[pressure] ?? '#4ADE80' }} />
              </div>
              <p className="text-center text-[9px] font-semibold leading-tight text-[#141210]">{displayName}</p>
              <p className="text-center text-[8px] leading-tight text-[#6E6A63]">{role}</p>
            </button>
          )
        })}
        {overflow > 0 && (
          <button className="flex w-[48px] flex-shrink-0 flex-col items-center gap-1 p-0">
            <div className="flex h-[32px] w-[32px] items-center justify-center rounded-full border border-dashed border-[#D4C9B4] bg-[#F0EBE1]">
              <span className="text-[10px] font-semibold text-[#5E5348]">+{overflow}</span>
            </div>
            <p className="text-[9px] font-medium text-[#6E6A63]">More</p>
          </button>
        )}
        {people.length === 0 && (
          <div className="w-full rounded-[18px] border border-dashed border-[#D4C9B4] px-4 py-4 text-center">
            <p className="text-[13px] font-medium text-[#8B847B]">No fluency partners yet.</p>
          </div>
        )}
      </div>
    </section>
  )
}
