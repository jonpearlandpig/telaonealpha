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
        </button>

        <button className="flex w-[84px] flex-shrink-0 flex-col items-center gap-1.5 p-0" onClick={onTelaTap}>
          <CircleShell background="linear-gradient(140deg, #11100D 0%, #2B2218 48%, #7A5A25 100%)" tone="dark">
            <div className="relative h-full w-full">
              <img src="/showtela/crusade-anchor.jpg" alt="Crusade" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,16,13,0.08)_0%,rgba(17,16,13,0.32)_100%)]" />
            </div>
          </CircleShell>
          <p className="text-center text-[12px] font-semibold leading-tight text-[#141210]">CRUSADE</p>
        </button>

        {items.map((p) => {
          const img = p.image ? facePhoto(p.image) : undefined
          const unresolved = p.unresolvedCount ?? 0
          const role = p.latest ?? ''
          const hasUnresolved = unresolved > 0
          const pressure = unresolved >= 2 ? 'high' : unresolved === 1 ? 'medium' : 'low'
          const hasPressure = hasUnresolved
          const cardShadow = hasUnresolved
            ? '0 0 0 1.5px rgba(216,167,66,0.42), 0 12px 44px rgba(0,0,0,0.30)'
            : '0 12px 44px rgba(0,0,0,0.22)'

          const handleTap = () => onPersonTap?.(p.name, role)

          return (
            <div
              key={p.id}
              role="button"
              tabIndex={0}
              className="relative flex-shrink-0 cursor-pointer overflow-hidden"
              style={{ width: '136px', height: '192px', borderRadius: '20px', boxShadow: cardShadow }}
              onClick={handleTap}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  handleTap()
                }
              }}
            >
              {img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={img} alt="" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'linear-gradient(160deg, #2A2520, #1A1712)' }}>
                  <span className="text-[44px] font-semibold text-[#F8E1B0]">{p.name.slice(0, 1)}</span>
                </div>
              )}

              {hasPressure && (
                <div
                  className="absolute inset-0"
                  style={{ background: pressure === 'high' ? 'rgba(196,96,16,0.18)' : 'rgba(196,136,16,0.10)' }}
                />
              )}

              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(to top, rgba(8,6,4,0.95) 0%, rgba(8,6,4,0.54) 40%, transparent 100%)' }}
              />

              {pressure === 'high' && (
                <div
                  className="absolute inset-x-0 bottom-0"
                  style={{ height: '72px', background: 'linear-gradient(to top, rgba(186,108,18,0.28) 0%, transparent 100%)' }}
                />
              )}

              <div className="absolute bottom-0 left-0 right-0 px-3.5 pb-3.5">
                <p className="text-[15px] font-semibold leading-tight text-white">{p.name.split(' ')[0]}</p>
                {role && (
                  <p className="mt-1 line-clamp-1 text-[10.5px] leading-tight text-white/65">{role}</p>
                )}
              </div>
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
