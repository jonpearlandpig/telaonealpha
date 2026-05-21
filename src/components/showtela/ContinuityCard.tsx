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
  const tags = (item.tags ?? []).slice(0, 3)
  const pulseColor = pressureColor(item.pressure)
  const isUnresolved = item.isNew || item.pressure === 'high'

  return (
    <article className="relative flex items-start gap-3 py-4">
      {/* Unresolved pressure indicator */}
      {pulseColor && (
        <span
          className="absolute left-0 top-5 h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: pulseColor, boxShadow: `0 0 0 3px ${pulseColor}22`, animation: isUnresolved ? 'subtlePulse 2.8s ease-in-out infinite' : undefined }}
        />
      )}

      {/* Image */}
      <div className="h-[64px] w-[64px] flex-shrink-0 overflow-hidden rounded-[12px] bg-[#D4C9B4]" style={{ boxShadow: '0 3px 10px rgba(0,0,0,0.10)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={itemImage} alt="" className="h-full w-full object-cover" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Meta row */}
        <div className="flex items-center gap-1.5 mb-1">
          {ownerName && (
            <span className="text-[10px] font-semibold text-[#C89B2F] uppercase tracking-[0.06em]">{ownerName}</span>
          )}
          {ownerName && <span className="text-[#D4C9B4] text-[10px]">·</span>}
          <span className="text-[10px] text-[#A89880]">{timeAgo(item.timestamp)}</span>
          {pulseColor && (
            <span className="ml-auto h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: pulseColor }} />
          )}
        </div>

        {/* Headline — single line, action-oriented */}
        <h3 className="text-[13px] font-semibold leading-snug text-[#141210] line-clamp-2">{item.headline}</h3>

        {/* ONE operational implication — max 1 sentence, muted */}
        {item.body && (
          <p className="mt-0.5 text-[11px] leading-relaxed text-[#7A6E63] line-clamp-1">{item.body}</p>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {tags.map((tag) => (
              <span key={tag} className="rounded-full bg-[#EAE4DA] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#8B7B62]">{tag}</span>
            ))}
          </div>
        )}
      </div>

      {/* Chevron */}
      <svg width="12" height="12" viewBox="0 0 14 14" fill="none" className="flex-shrink-0 mt-1 text-[#C4B89A]">
        <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>

      <style>{`
        @keyframes subtlePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
      `}</style>
    </article>
  )
}
