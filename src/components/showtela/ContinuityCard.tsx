'use client'

import { useState } from 'react'
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
  if (p === 'critical' || p === 'high') return '#E8775A'
  if (p === 'medium') return '#C89B2F'
  return null
}

export function ContinuityCard({ item }: { item: ContinuityEvent }) {
  const [showTranscript, setShowTranscript] = useState(false)
  const itemImage = item.image || FALLBACK_IMAGES[Math.abs(item.id.charCodeAt(0)) % FALLBACK_IMAGES.length]
  const ownerName = item.owner?.name ?? ''
  const tags = (item.tags ?? []).slice(0, 1)
  const pulseColor = pressureColor(item.pressure)
  const hasTranscript = Boolean(item.rawTranscript && item.rawTranscript !== item.body)

  return (
    <article className="flex flex-col gap-0 py-5">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {pulseColor && (
              <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ backgroundColor: pulseColor }} />
            )}
            <span className="text-[11px] text-[#9B9187]">{timeAgo(item.timestamp)}</span>
            {item.classification && (
              <span className="rounded-full bg-[#F0EBE1] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8A7351]">
                {item.classification}
              </span>
            )}
          </div>

          <h3 className="mt-3 text-[18px] font-semibold leading-snug tracking-[-0.4px] text-[#141210]">{item.headline}</h3>

          {item.body && (
            <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-[#7E7870]">{item.body}</p>
          )}

          {tags.length > 0 && <span className="mt-2 inline-block text-[12px] font-medium text-[#141210]">{tags[0]}</span>}
          {ownerName && <p className="mt-1 text-[12px] text-[#7E7870]">{ownerName}</p>}
        </div>

        <div className="h-[76px] w-[76px] flex-shrink-0 overflow-hidden rounded-[16px] bg-[#D4C9B4]">
          <img src={itemImage} alt="" className="h-full w-full object-cover" />
        </div>
      </div>

      {item.nextActions && item.nextActions.length > 0 && (
        <ul className="mt-2 space-y-1 pl-1">
          {item.nextActions.slice(0, 3).map((action, i) => (
            <li key={i} className="flex items-start gap-1.5 text-[11px] text-[#6B5D4B]">
              <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#C89B2F]" />
              {action}
            </li>
          ))}
        </ul>
      )}

      {hasTranscript && (
        <button
          type="button"
          onClick={() => setShowTranscript(v => !v)}
          className="mt-2 text-left text-[11px] font-medium text-[#9A7C46] underline underline-offset-2"
        >
          {showTranscript ? 'Hide transcript' : 'See transcript'}
        </button>
      )}

      {showTranscript && item.rawTranscript && (
        <p className="mt-2 rounded-[10px] bg-[#F4EEE4] px-3 py-2 text-[11px] leading-relaxed text-[#6B5D4B]">
          {item.rawTranscript}
        </p>
      )}
    </article>
  )
}
