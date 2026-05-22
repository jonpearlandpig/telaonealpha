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
  if (p === 'high') return '#E8775A'
  if (p === 'medium') return '#C89B2F'
  return null
}

export function ContinuityCard({ item }: { item: ContinuityEvent }) {
  const itemImage = item.image || FALLBACK_IMAGES[Math.abs(item.id.charCodeAt(0)) % FALLBACK_IMAGES.length]
  const ownerName = item.owner?.name ?? ''
  const tags = (item.tags ?? []).slice(0, 1)
  const pulseColor = pressureColor(item.pressure)

  return (
    <article className="flex items-start gap-4 py-4">
      {/* Text content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {pulseColor && (
            <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ backgroundColor: pulseColor }} />
          )}
          {ownerName && (
            <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[#C89B2F]">{ownerName}</span>
          )}
          {ownerName && <span className="text-[10px] text-[#C8BFB0]">·</span>}
          <span className="text-[11px] text-[#9B9187]">{timeAgo(item.timestamp)}</span>
        </div>

        <h3 className="mt-1.5 text-[15px] font-semibold leading-snug tracking-[-0.2px] text-[#141210]">{item.headline}</h3>

        {item.body && (
          <p className="mt-0.5 line-clamp-1 text-[12px] leading-relaxed text-[#7E7870]">{item.body}</p>
        )}

        {tags.length > 0 && (
          <span className="mt-2 inline-block rounded-full bg-[#EDEAE4] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.06em] text-[#7A7570]">{tags[0]}</span>
        )}
      </div>

      {/* Reference thumbnail */}
      <div className="h-[60px] w-[60px] flex-shrink-0 overflow-hidden rounded-[12px] bg-[#D4C9B4]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={itemImage} alt="" className="h-full w-full object-cover" />
      </div>
    </article>
  )
}
