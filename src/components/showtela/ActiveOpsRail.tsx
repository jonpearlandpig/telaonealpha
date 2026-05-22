'use client'
import type { PersonEntity } from '@/lib/showtela/types'

function facePhoto(url: string): string {
  if (!url) return url
  if (url.includes('googleusercontent.com')) {
    return url.replace(/=s\d+-c$/, '=s400-c')
  }
  return url
}

export function ActiveOpsRail(
  props:
    | { people: PersonEntity[]; onPersonTap?: (name: string, role?: string) => void; onPearlDrop?: (personName: string) => void }
    | { items: Array<{ id: string; name: string; latest?: string; unresolvedCount: number; image: string; updatesCount?: number }>; onPersonTap?: (name: string, role?: string) => void; onPearlDrop?: (personName: string) => void }
) {
  const onPersonTap = props.onPersonTap
  const onPearlDrop = props.onPearlDrop
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
        <button className="text-[11px] font-medium text-[#C89B2F]">View all</button>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {people.map((p) => {
          const img = ('avatar' in p && p.avatar) ? facePhoto(p.avatar) : undefined
          const unresolved = p.unresolvedCount ?? 0
          const role = ('role' in p && p.role) ? p.role : ''
          const hasUnresolved = unresolved > 0

          return (
            <button key={p.id} className="flex w-[80px] flex-shrink-0 flex-col items-center gap-1.5 p-0" onClick={() => onPersonTap?.(p.name, role)}>
              <div className="relative">
                <div
                  className="flex h-[76px] w-[76px] items-center justify-center rounded-full p-[2.5px]"
                  style={{ background: hasUnresolved ? '#F87171' : 'linear-gradient(135deg, #C89B2F, #F0D080, #C89B2F)' }}
                >
                  <div className="h-full w-full overflow-hidden rounded-full bg-[#1A1712]">
                    {img
                      ? <img src={img} alt={p.name} className="h-full w-full object-cover" />
                      : <div className="flex h-full w-full items-center justify-center text-[22px] font-semibold text-[#F8E1B0]">{p.name.slice(0, 1)}</div>
                    }
                  </div>
                </div>
                <span className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full border-2 border-[#F8F6F2] bg-[#4ADE80]" />
                {/* Pearl Drop + button */}
                <button
                  onClick={(e) => { e.stopPropagation(); onPearlDrop?.(p.name) }}
                  className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#F8F6F2] bg-[#141210] shadow-[0_2px_8px_rgba(0,0,0,0.30)]"
                >
                  <span className="text-[14px] font-semibold text-white leading-none">+</span>
                </button>
              </div>
              <p className="text-center text-[12px] font-semibold leading-tight text-[#141210]">{p.name.split(' ')[0]}</p>
              <p className="text-center text-[10px] leading-tight text-[#6E6A63]">{role}</p>
            </button>
          )
        })}
        {people.length === 0 && (
          <div className="w-full rounded-[18px] border border-dashed border-[#D4C9B4] px-4 py-5 text-center">
            <p className="text-[13px] font-medium text-[#8B847B]">No active operators yet.</p>
          </div>
        )}
      </div>
    </section>
  )
}
