'use client'
import { BottomSheet } from './BottomSheet'
import type { ContinuityEvent } from '@/lib/showtela/types'
import { TELAwhyCard } from '../TELAwhyCard'

function formatTime(iso?: string) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) }
  catch { return '' }
}

const PRIORITY_COLOR: Record<string, string> = { High: '#F87171', Medium: '#F59E0B', Low: '#4ADE80' }

export function FeedSheet({ item, open, onClose }: { item: ContinuityEvent | null; open: boolean; onClose: () => void }) {
  if (!item) return null
  const tags = item.tags ?? []

  return (
    <BottomSheet open={open} onClose={onClose} title={item.headline ?? ''}>
      <div className="flex items-center gap-2 mb-4">
        <p className="text-[11px] font-medium text-[#C89B2F]">{formatTime(item.timestamp)}</p>
        {item.owner?.name && <p className="text-[11px] text-[#8B847B]">· {item.owner.name}</p>}
        {item.pressure && (
          <span className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: `${PRIORITY_COLOR[item.pressure] ?? '#4ADE80'}22`, color: PRIORITY_COLOR[item.pressure] ?? '#4ADE80' }}>
            {item.pressure}
          </span>
        )}
      </div>
      {item.image && (
        <div className="mb-4 overflow-hidden rounded-[16px] bg-[#D4C9B4]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.image} alt="" className="w-full object-cover max-h-[200px]" />
        </div>
      )}
      {item.body && (
        <div className="mb-4 rounded-[14px] bg-white px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <p className="text-[13px] leading-relaxed text-[#141210]">{item.body}</p>
        </div>
      )}
      {tags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span key={tag} className="rounded-full bg-[#EAE4DA] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#5E5348]">{tag}</span>
          ))}
        </div>
      )}
      {item.waitingOn && (
        <div className="mb-3 flex items-center gap-2 rounded-[12px] bg-[#FEF3C7] px-4 py-2.5">
          <span className="text-[13px]">⏳</span>
          <p className="text-[12px] text-[#92400E]">Waiting on {item.waitingOn}</p>
        </div>
      )}
      {item.blockedBy && (
        <div className="mb-3 flex items-center gap-2 rounded-[12px] bg-[#FEE2E2] px-4 py-2.5">
          <span className="text-[13px]">🚫</span>
          <p className="text-[12px] text-[#991B1B]">Blocked by {item.blockedBy}</p>
        </div>
      )}
      {item.telaWhy && (
        <div className="mt-4">
          <TELAwhyCard why={item.telaWhy} />
        </div>
      )}
    </BottomSheet>
  )
}
