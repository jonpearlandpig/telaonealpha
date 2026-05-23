'use client'

import { useState } from 'react'
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
  const [expanded, setExpanded] = useState(false)
  const onPersonTap = props.onPersonTap
  const people = 'people' in props ? props.people
    : props.items.map((i) => ({
        id: i.id,
        name: i.label ?? i.name ?? '',
        unresolvedCount: i.unresolvedCount,
        role: i.latest ?? '',
        avatar: i.image,
      }))

  const visibleLimit = expanded ? 6 : 4
  const overflow = people.length > visibleLimit ? people.length - visibleLimit : 0
  const visible = people.slice(0, visibleLimit)

  return (
    <section className="pb-4 pt-0 opacity-80">
      <div className="flex items-center justify-between px-5">
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7A7167]"
        >
          Open Fluency Partners
        </button>
        {people.length > 0 && (
          <span className="text-[10px] font-medium text-[#A19688]">{people.length}</span>
        )}
      </div>

      <div className={`mt-3 flex overflow-x-auto pl-5 pr-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${expanded ? 'gap-4' : 'gap-2.5'}`}>
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
                className={`${expanded ? 'w-[58px] gap-2' : 'w-[44px] gap-1.5'} flex flex-shrink-0 flex-col items-center p-0`}
                onClick={() => onPersonTap?.(p.name || role, role)}
              >
                <div
                  className={`${expanded ? 'h-[48px] w-[48px]' : 'h-[36px] w-[36px]'} flex items-center justify-center rounded-full p-[1.5px] shadow-[0_4px_10px_rgba(17,17,17,0.04)]`}
                  style={{ background: ringBg }}
                >
                  <div className="h-full w-full overflow-hidden rounded-full" style={{ background: '#F2EDE4' }}>
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center" style={{ background: '#1C1814' }}>
                        <span className="font-semibold text-[#F0DEB8]" style={{ fontSize: expanded ? (hasName ? '16px' : '9px') : '10px' }}>{initial}</span>
                      </div>
                    )}
                  </div>
                </div>
                {expanded && <p className="text-center text-[10px] font-medium leading-tight text-[#6E655B]">{displayName}</p>}
              </button>
            )
          })}

          {overflow > 0 && (
            <div className={`${expanded ? 'w-[58px] gap-2' : 'w-[44px] gap-1.5'} flex flex-shrink-0 flex-col items-center`}>
              <div
                className={`${expanded ? 'h-[48px] w-[48px]' : 'h-[36px] w-[36px]'} flex items-center justify-center rounded-full`}
                style={{ border: '1.5px dashed rgba(180,168,148,0.55)', background: '#F0EBE1' }}
              >
                <span className="text-[11px] font-semibold text-[#6E655B]">+{overflow}</span>
              </div>
              {expanded && <span className="text-[9px] uppercase tracking-[0.12em] text-[#8B847B]">more</span>}
            </div>
          )}

        {people.length === 0 && (
          <p className="min-w-[180px] py-2 text-[11px] text-[#9A9083]">No fluency partners yet.</p>
        )}
        </div>
    </section>
  )
}
