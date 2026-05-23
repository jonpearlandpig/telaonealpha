import type { ConstitutionalEvent } from '@/lib/constitutional/types'

function formatTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Time pending'
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).replace(' AM', 'A').replace(' PM', 'P')
}

function listLine(items: string[]) {
  return items.slice(0, 3).join(' / ') || 'No overlays'
}

export function EventCard({ event }: { event: ConstitutionalEvent }) {
  return (
    <article className="rounded-[18px] border border-[#3A3429] bg-[#151B24] px-3 py-3 text-[#F7EBD6]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#C8A85F]">{event.event_type.replaceAll('_', ' ')}</p>
          <h3 className="mt-1 line-clamp-2 text-[14px] font-semibold leading-snug">{event.title ?? 'Untitled constitutional event'}</h3>
        </div>
        <time className="flex-shrink-0 text-[10px] font-medium text-[#B8AC98]">{formatTime(event.created_at)}</time>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-[12px] border border-white/10 bg-white/[0.04] px-2.5 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#AFA48F]">Governance</p>
          <p className="mt-1 text-[11px] font-semibold capitalize">{event.governance_state ?? 'unset'}</p>
        </div>
        <div className="rounded-[12px] border border-white/10 bg-white/[0.04] px-2.5 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#AFA48F]">Execution</p>
          <p className="mt-1 text-[11px] font-semibold capitalize">{event.execution_state ?? 'unset'}</p>
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-[#D7CCB9]">{listLine(event.operator_overlays)}</p>
      <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#938873]">
        Parent {event.parent_event_id ? event.parent_event_id.slice(0, 8) : 'root'}
      </p>
    </article>
  )
}
