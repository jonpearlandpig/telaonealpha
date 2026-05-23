'use client'

import type { ReactNode } from 'react'

type ActiveRailItem = {
  id: string
  name: string
  latest?: string
  unresolvedCount: number
  image: string
  updatesCount?: number
}

function facePhoto(url: string): string {
  if (!url) return url
  if (url.includes('googleusercontent.com')) {
    return url.replace(/=s\d+-c$/, '=s400-c')
  }
  return url
}

function CircleShell({
  children,
  background,
  tone = 'light',
}: {
  children: ReactNode
  background: string
  tone?: 'light' | 'dark'
}) {
  return (
    <div
      className="flex h-[78px] w-[78px] items-center justify-center rounded-full p-[2.5px] shadow-[0_10px_24px_rgba(17,17,17,0.10)]"
      style={{ background }}
    >
      <div className={`flex h-full w-full items-center justify-center overflow-hidden rounded-full ${tone === 'dark' ? 'bg-[#18140F]' : 'bg-[#F8F6F2]'}`}>
        {children}
      </div>
    </div>
  )
}

export function ActiveOpsRail({
  userName,
  userImage,
  items,
  onProfileTap,
  onTelaTap,
  onPersonTap,
  onAddContinuity,
}: {
  userName?: string
  userImage?: string
  items: ActiveRailItem[]
  onProfileTap?: () => void
  onTelaTap?: () => void
  onPersonTap?: (name: string, role?: string) => void
  onAddContinuity?: () => void
}) {
  const firstName = userName?.split(' ')[0] ?? 'You'

  return (
    <section className="px-5 pb-5 pt-1">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#5E5348]">Anchors</h2>
        <button className="text-[11px] font-medium text-[#C89B2F]">View all</button>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button className="flex w-[84px] flex-shrink-0 flex-col items-center gap-1.5 p-0" onClick={onProfileTap}>
          <div className="relative">
            <CircleShell background="linear-gradient(135deg, #D5C4A2 0%, #F6E9C9 55%, #C8A25A 100%)">
              {userImage
                ? <img src={facePhoto(userImage)} alt={userName ?? 'You'} className="h-full w-full object-cover" />
                : <div className="flex h-full w-full items-center justify-center bg-[#1A1712] text-[22px] font-semibold text-[#F8E1B0]">{firstName.slice(0, 1)}</div>}
            </CircleShell>
            <button
              onClick={(event) => {
                event.stopPropagation()
                onAddContinuity?.()
              }}
              className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#F8F6F2] bg-[#141210] shadow-[0_2px_8px_rgba(0,0,0,0.24)]"
              aria-label="Add continuity"
            >
              <span className="text-[14px] font-semibold leading-none text-white">+</span>
            </button>
          </div>
          <p className="text-center text-[12px] font-semibold leading-tight text-[#141210]">{firstName}</p>
          <p className="text-center text-[10px] leading-tight text-[#6E6A63]">Personal anchor</p>
        </button>

        <button className="flex w-[84px] flex-shrink-0 flex-col items-center gap-1.5 p-0" onClick={onTelaTap}>
          <div className="relative">
            <CircleShell background="linear-gradient(140deg, #11100D 0%, #2B2218 48%, #7A5A25 100%)" tone="dark">
              <div className="flex h-full w-full flex-col items-center justify-center bg-[radial-gradient(circle_at_top,#3B3125_0%,#17130F_62%)]">
                <span className="text-[14px] font-semibold tracking-[0.18em] text-[#E3BE68]">TELA</span>
              </div>
            </CircleShell>
            <span className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full border border-[#5A4725] bg-[#221B13] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#DABD79]">
              Crusade
            </span>
          </div>
          <p className="text-center text-[12px] font-semibold leading-tight text-[#141210]">SHOWTELA</p>
          <p className="min-h-[12px] text-center text-[10px] leading-tight text-transparent">.</p>
        </button>

        {items.map((p) => {
          const img = p.image ? facePhoto(p.image) : undefined
          const unresolved = p.unresolvedCount ?? 0
          const role = p.latest ?? ''
          const hasUnresolved = unresolved > 0
          const handleTap = () => onPersonTap?.(p.name, role)

          return (
            <div
              key={p.id}
              role="button"
              tabIndex={0}
              className="flex w-[80px] flex-shrink-0 flex-col items-center gap-1.5 p-0"
              onClick={handleTap}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  handleTap()
                }
              }}
            >
              <div className="relative">
                <CircleShell background={hasUnresolved ? 'linear-gradient(135deg, #7A6451 0%, #C7A77A 100%)' : 'linear-gradient(135deg, #D8CCB8 0%, #F5ECE0 100%)'}>
                  {img
                    ? <img src={img} alt={p.name} className="h-full w-full object-cover" />
                    : <div className="flex h-full w-full items-center justify-center text-[22px] font-semibold text-[#6F541A]">{p.name.slice(0, 1)}</div>}
                </CircleShell>
                <span className={`absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full border-2 border-[#F8F6F2] ${hasUnresolved ? 'bg-[#C89B2F]' : 'bg-[#6FAE7B]'}`} />
              </div>
              <p className="text-center text-[12px] font-semibold leading-tight text-[#141210]">{p.name.split(' ')[0]}</p>
              <p className="text-center text-[10px] leading-tight text-[#6E6A63]">{role}</p>
            </div>
          )
        })}

        {items.length === 0 && (
          <div className="w-full rounded-[18px] border border-dashed border-[#D4C9B4] px-4 py-5 text-center">
            <p className="text-[13px] font-medium text-[#8B847B]">No active operators yet.</p>
          </div>
        )}
      </div>
    </section>
  )
}
