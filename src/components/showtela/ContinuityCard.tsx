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
  const tags = (item.tags ?? []).slice(0, 2)
  const pulseColor = pressureColor(item.pressure)
  const isUnresolved = item.isNew || item.pressure === 'high'
  const pressureLabel = item.pressure === 'high' ? 'High' : 'Med'

  return (
    <article className="overflow-hidden rounded-[20px] bg-[#FDFCFA] shadow-[0_4px_20px_rgba(0,0,0,0.07)]">
      {/* Image header */}
      <div className="relative h-[148px] w-full bg-[#D4C9B4]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={itemImage} alt="" className="h-full w-full object-cover" />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(8,6,4,0.55) 0%, rgba(8,6,4,0.10) 55%, transparent 100%)' }}
        />
        {pulseColor && (
          <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 backdrop-blur-sm">
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
      <div className="px-5 pb-5 pt-4">
        <div className="flex items-center gap-1.5">
          {ownerName && (
            <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[#C89B2F]">{ownerName}</span>
          )}
          {ownerName && <span className="text-[10px] text-[#C8BFB0]">·</span>}
          <span className="text-[11px] text-[#9B9187]">{timeAgo(item.timestamp)}</span>
        </div>

        <h3 className="mt-2 text-[17px] font-semibold leading-snug tracking-[-0.3px] text-[#141210]">{item.headline}</h3>

        {item.body && (
          <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-[#6B6560]">{item.body}</p>
        )}

        {tags.length > 0 && (
          <div className="mt-3 flex gap-1.5">
            {tags.map((tag) => (
              <span key={tag} className="rounded-full bg-[#EDEAE4] px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.07em] text-[#6B6560]">{tag}</span>
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
