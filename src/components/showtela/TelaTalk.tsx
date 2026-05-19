'use client'
import type { PersonItem } from './types'

function timeAgo(iso?: string) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function TelaTalk({
  activeOps,
  fluencyPartners,
  onPersonTap,
  onVoiceTap,
}: {
  activeOps: PersonItem[]
  fluencyPartners: PersonItem[]
  onPersonTap: (name: string, role?: string) => void
  onVoiceTap: (name?: string) => void
}) {
  const all = [...activeOps, ...fluencyPartners.slice(0, 6)]

  return (
    <div style={{ backgroundColor: '#fff', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-14 pb-3 border-b border-stone-100">
        <h1 className="text-xl font-bold text-stone-900">TELA Talk</h1>
        <button onClick={() => onVoiceTap()} className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-100">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" fill="#141210"/>
            <path d="M19 10a7 7 0 0 1-14 0" stroke="#141210" strokeWidth="1.8" strokeLinecap="round"/>
            <path d="M12 19v3" stroke="#141210" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 rounded-full bg-stone-100 px-4 py-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="#8B847B" strokeWidth="2"/>
            <path d="M16 16l4 4" stroke="#8B847B" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span className="text-sm text-stone-400">Search</span>
        </div>
      </div>

      {/* Stories-style Active Ops row */}
      <div className="flex gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:none]">
        {activeOps.map((p) => (
          <button key={p.id} onClick={() => onPersonTap(p.name, p.latest)} className="flex flex-col items-center gap-1 flex-shrink-0">
            <div className="relative">
              <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-yellow-500">
                {p.image
                  ? <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                  : <div className="flex h-full w-full items-center justify-center bg-stone-800 text-lg font-semibold text-yellow-200">{p.name.slice(0,1)}</div>
                }
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onVoiceTap(p.name) }}
                className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-stone-900"
              >
                <span className="text-xs font-bold text-white leading-none">+</span>
              </button>
            </div>
            <p className="text-xs font-medium text-stone-700 max-w-16 truncate">{p.name.split(' ')[0]}</p>
          </button>
        ))}
      </div>

      <div className="h-px bg-stone-100 mx-4" />

      {/* Messages list — Instagram style */}
      <div className="px-4">
        <p className="py-3 text-xs font-semibold uppercase tracking-wider text-stone-400">Messages</p>
        {all.map((p) => (
          <button key={p.id} onClick={() => onPersonTap(p.name, p.latest)} className="flex w-full items-center gap-3 py-3 text-left">
            <div className="relative flex-shrink-0">
              <div className="h-14 w-14 overflow-hidden rounded-full border border-stone-200 bg-stone-800">
                {p.image
                  ? <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                  : <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-yellow-200">{p.name.slice(0,1)}</div>
                }
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onVoiceTap(p.name) }}
                className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-stone-900"
              >
                <span className="text-xs font-bold text-white leading-none">+</span>
              </button>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-stone-900">{p.name}</p>
              <p className="truncate text-sm text-stone-500">{p.latest}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
