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
    <section className="relative">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5E5348]">Anchors</h2>
        <button className="text-[11px] font-medium text-[#9A7C46]">Open line</button>
      </div>
      <div className="flex flex-col gap-4">
        <div
          role="button"
          tabIndex={0}
          className="group flex items-center gap-3 rounded-[24px] bg-white/40 px-2 py-1 text-left transition-[background-color,transform] duration-300 hover:bg-white/70 hover:translate-x-0.5"
          onClick={onProfileTap}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onProfileTap?.()
            }
          }}
        >
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
          <div className="min-w-0">
            <p className="text-[12px] font-semibold leading-tight text-[#141210]">{firstName}</p>
            <p className="text-[11px] leading-tight text-[#7C7165]">Add continuity</p>
          </div>
        </div>

        <button
          className="group flex items-center gap-3 rounded-[24px] bg-white/40 px-2 py-1 text-left transition-[background-color,transform] duration-300 hover:bg-white/70 hover:translate-x-0.5"
          onClick={onTelaTap}
        >
          <CircleShell background="linear-gradient(140deg, #11100D 0%, #2B2218 48%, #7A5A25 100%)" tone="dark">
            <div className="relative h-full w-full">
              <img src="/showtela/crusade-anchor.jpg" alt="Crusade" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,16,13,0.08)_0%,rgba(17,16,13,0.32)_100%)]" />
            </div>
          </CircleShell>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold leading-tight text-[#141210]">Crusade</p>
            <p className="text-[11px] leading-tight text-[#7C7165]">Persistent thread</p>
          </div>
        </button>

        {items.slice(0, 4).map((p) => {
          const img = p.image ? facePhoto(p.image) : undefined
          const unresolved = p.unresolvedCount ?? 0
          const role = p.latest ?? ''
          const hasUnresolved = unresolved > 0
          const ringBg = unresolved >= 2
            ? 'linear-gradient(135deg, #7A6451 0%, #C7A77A 100%)'
            : hasUnresolved
              ? 'linear-gradient(135deg, #B89A52 0%, #D8C080 100%)'
              : 'linear-gradient(135deg, #D8CCB8 0%, #F5ECE0 100%)'

          return (
            <button
              key={p.id}
              className="group flex items-center gap-3 rounded-[24px] bg-white/30 px-2 py-1 text-left transition-[background-color,transform] duration-300 hover:bg-white/70 hover:translate-x-0.5"
              onClick={() => onPersonTap?.(p.name, role)}
            >
              <CircleShell background={ringBg}>
                {img
                  ? <img src={img} alt={p.name} className="h-full w-full object-cover" />
                  : <div className="flex h-full w-full items-center justify-center text-[22px] font-semibold text-[#6F541A]">{p.name.slice(0, 1)}</div>}
              </CircleShell>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold leading-tight text-[#141210]">{p.name.split(' ')[0]}</p>
                <p className="line-clamp-1 text-[11px] leading-tight text-[#7C7165]">
                  {unresolved > 0 ? `${unresolved} open` : (role || 'Standing by')}
                </p>
              </div>
            </button>
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
