import type { ContinuityEvent } from '@/lib/showtela/types'

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=900&q=80',
  'https://images.unsplash.com/photo-1464375117522-1311dd6a1f0a?w=900&q=80',
  'https://images.unsplash.com/photo-1503095396549-807759245b35?w=900&q=80',
  'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=900&q=80',
]

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
  const itemImage = item.image || FALLBACK_IMAGES[Math.abs(item.id.charCodeAt(0)) % FALLBACK_IMAGES.length]
  const ownerName = item.owner?.name ?? ''
  const tags = item.tags ?? []
  const pulseColor = pressureColor(item.pressure)
  const isUnresolved = item.isNew || item.pressure === 'high'
  const pressureLabel = item.pressure === 'high' ? 'High pressure' : 'Medium'

  return (
    <article className="overflow-hidden rounded-[20px] bg-[#FDFCFA] shadow-[0_6px_28px_rgba(0,0,0,0.09)]">
      {/* Image header */}
      <div className="relative h-[140px] w-full bg-[#D4C9B4]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={itemImage} alt="" className="h-full w-full object-cover" />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(8,6,4,0.40) 0%, transparent 60%)' }}
        />
        {pulseColor && (
          <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/38 px-2.5 py-1 backdrop-blur-sm">
            <span
              className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
              style={{
                backgroundColor: pulseColor,
                animation: isUnresolved ? 'subtlePulse 2.8s ease-in-out infinite' : undefined,
              }}
            />
            <span className="text-[10px] font-semibold leading-none text-white/90">{pressureLabel}</span>
          </span>
        )}
      </div>

      {/* Content */}
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {ownerName && (
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#C89B2F]">{ownerName}</span>
            )}
            {ownerName && <span className="text-[10px] text-[#D4C9B4]">·</span>}
            <span className="text-[11px] text-[#8B847B]">{timeAgo(item.timestamp)}</span>
          </div>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-0.5 flex-shrink-0 text-[#B8A88A]">
            <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <h3 className="mt-2 text-[16px] font-semibold leading-snug tracking-[-0.2px] text-[#141210]">{item.headline}</h3>

        {item.body && (
          <p className="mt-1.5 text-[13px] leading-relaxed text-[#5E5348]">{item.body}</p>
        )}

        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span key={tag} className="rounded-full bg-[#EAE4DA] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#5E5348]">{tag}</span>
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
