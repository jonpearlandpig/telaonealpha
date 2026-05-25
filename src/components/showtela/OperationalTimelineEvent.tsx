import type { OperationalLineageEvent } from '@/lib/showtela/lineage'

function formatTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Time open'
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export function OperationalTimelineEvent({ event }: { event: OperationalLineageEvent }) {
  return (
    <div className="flex gap-3 rounded-[18px] bg-[#FFFDF8] px-3 py-3 shadow-[0_8px_20px_rgba(27,22,16,0.05)]">
      <div className="flex w-4 flex-shrink-0 flex-col items-center pt-1">
        <span className="h-2.5 w-2.5 rounded-full bg-[#C89B2F] shadow-[0_0_14px_rgba(200,155,47,0.28)]" />
        <span className="mt-1 w-px flex-1 bg-[#E3D3B8]" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="line-clamp-1 text-[13px] font-semibold text-[#17130F]">{event.affectedDepartment}</p>
          <p className="flex-shrink-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#9A825F]">{formatTime(event.timestamp)}</p>
        </div>
        <p className="mt-1 text-[12px] leading-relaxed text-[#5E5348]">{event.lineageSummary}</p>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9A7C46]">
          {event.eventType} / {event.continuityImpact}
        </p>
      </div>
    </div>
  )
}
