import type { ContinuityEvent } from '@/lib/showtela/types'

function formatTime(iso?: string) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) }
  catch { return iso }
}

const OWNER_IMAGES: Record<string, string> = {
  jon: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=80&auto=format&fit=crop',
  juan: 'https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=80&auto=format&fit=crop',
  mags: 'https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=80&auto=format&fit=crop',
  kristen: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?q=80&w=80&auto=format&fit=crop',
}

export function ContinuityCard({ item }: { item: ContinuityEvent }) {
  const ownerKey = (item.owner?.name ?? '').toLowerCase()
  const ownerImg = OWNER_IMAGES[ownerKey]
  const tags = item.tags ?? []
  return (
    <article className="flex items-start gap-3 border-b border-[#EAE4DA] bg-transparent py-4 last:border-b-0">
      {item.image && (
        <div className="h-[72px] w-[72px] flex-shrink-0 overflow-hidden rounded-[14px] bg-[#D4C9B4]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.image} alt="" className="h-full w-full object-cover" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-medium text-[#C89B2F]">{formatTime(item.timestamp)}</p>
            {ownerImg && <div className="h-5 w-5 overflow-hidden rounded-full border border-[#D4C9B4]"><img src={ownerImg} alt="" className="h-full w-full object-cover" /></div>}
          </div>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0 text-[#B8A88A]"><path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <h3 className="mt-1 text-[14px] font-semibold leading-tight text-[#141210]">{item.headline}</h3>
        <p className="mt-0.5 text-[12px] leading-relaxed text-[#5E5348]">{item.body}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {tags.map((tag) => <span key={tag} className="rounded-full bg-[#EAE4DA] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#5E5348]">{tag}</span>)}
        </div>
      </div>
    </article>
  )
}
