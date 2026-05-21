import type { ContinuityEvent } from '@/lib/showtela/types'

function timeAgo(iso?: string) {
  if (!iso) return ''
  try {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 2) return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  } catch { return '' }
}

function pressureColor(pressure?: string) {
  if (!pressure) return null
  const p = pressure.toLowerCase()
  if (p === 'high') return '#F87171'
  if (p === 'medium') return '#F59E0B'
  return null
}

export function ContinuityCard({ item }: { item: ContinuityEvent }) {
  const FALLBACK_IMAGES = [
    'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=900',
    'https://images.unsplash.com/photo-1464375117522-1311dd6a1f0a?w=900',
    'https://images.unsplash.com/photo-1503095396549-807759245b35?w=900',
    'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=900',
  ]
  const itemImage = item.image || FALLBACK_IMAGES[Math.abs(item.id.charCodeAt(0)) % FALLBACK_IMAGES.length]
  const ownerName = item.owner?.name ?? ''
  const tags = item.tags ?? []
  const pulseColor = pressureColor(item.pressure)
  const isUnresolved = item.isNew || item.pressure === 'high'

  return (
    <article className="relative flex items-start gap-3 border-b border-[#EAE4DA] bg-transparent py-4 last:border-b-0">
      {/* Unresolved pressure indicator */}
      {pulseColor && (
        <span
          className="absolute left-0 top-6 h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: pulseColor, boxShadow: `0 0 0 3px ${pulseColor}22`, animation: isUnresolved ? 'subtlePulse 2.8s ease-in-out infinite' : undefined }}
        />
      )}

      {/* Image */}
      <div className="h-[72px] w-[72px] flex-shrink-0 overflow-hidden rounded-[14px] bg-[#D4C9B4] shadow-[0_4px_14px_rgba(0,0,0,0.12)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={itemImage} alt="" className="h-full w-full object-cover" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {ownerName && (
              <span className="text-[11px] font-semibold text-[#C89B2F] uppercase tracking-[0.06em]">{ownerName}</span>
            )}
            {ownerName && <span className="text-[#D4C9B4] text-[10px]">·</span>}
            <span className="text-[11px] text-[#8B847B]">{timeAgo(item.timestamp)}</span>
            {pulseColor && (
              <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: pulseColor }} />
            )}
          </div>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0 mt-0.5 text-[#B8A88A]">
            <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <h3 className="mt-1 text-[14px] font-semibold leading-tight text-[#141210]">{item.headline}</h3>

        {item.body && (
          <p className="mt-0.5 text-[12px] leading-relaxed text-[#5E5348]">{item.body}</p>
        )}

        {tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span key={tag} className="rounded-full bg-[#EAE4DA] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#5E5348]">{tag}</span>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes subtlePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
      `}</style>
    </article>
  )
}
