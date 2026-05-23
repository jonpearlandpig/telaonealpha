import type { OperationalCalendarEvent } from '@/lib/showtela/calendar'
import type { OperationalReasoningSummary } from '@/lib/showtela/reasoning'

function titleFor(event?: OperationalCalendarEvent) {
  return event?.title ?? 'No pressure event'
}

export function TelaReasoningPanel({
  summary,
}: {
  summary: OperationalReasoningSummary
}) {
  const keyDependency = summary.keyDependency

  return (
    <section className="rounded-[24px] border border-[#E3D7C6] bg-[#FFF9F1] px-4 py-4 text-[#2C241C] shadow-[0_14px_30px_rgba(20,16,12,0.07)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9A7C46]">Context Layer</p>
          <h2 className="mt-1 text-[18px] font-semibold leading-tight">Why this day is being surfaced</h2>
        </div>
        <span className="rounded-full bg-[#F3EADB] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8A6725]">
          Derived
        </span>
      </div>

      <p className="mt-3 text-[12px] leading-relaxed text-[#6B5D4B]">{summary.recommendedFocus}</p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-[14px] border border-[#E7DCCB] bg-white px-3 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#9A8A76]">Blocked Dept</p>
          <p className="mt-1 line-clamp-1 text-[12px] font-semibold">{summary.mostBlockedDepartment ?? 'None detected'}</p>
        </div>
        <div className="rounded-[14px] border border-[#E7DCCB] bg-white px-3 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#9A8A76]">Highest Risk</p>
          <p className="mt-1 line-clamp-1 text-[12px] font-semibold">{titleFor(summary.highestPressureEvent)}</p>
        </div>
        <div className="rounded-[14px] border border-[#E7DCCB] bg-white px-3 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#9A8A76]">Oldest Open</p>
          <p className="mt-1 line-clamp-1 text-[12px] font-semibold">{titleFor(summary.oldestUnresolvedItem)}</p>
        </div>
        <div className="rounded-[14px] border border-[#E7DCCB] bg-white px-3 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#9A8A76]">Drift</p>
          <p className="mt-1 line-clamp-1 text-[12px] font-semibold capitalize">{summary.drift.driftLevel}</p>
        </div>
      </div>

      <div className="mt-4 rounded-[16px] border border-[#E7DCCB] bg-[#FCF6EC] px-3 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9A7C46]">Why This Matters</p>
        <p className="mt-1 text-[12px] leading-relaxed text-[#6B5D4B]">
          {keyDependency
            ? `${keyDependency.department} is the clearest dependency signal because ${keyDependency.dependencyReason.toLowerCase()}`
            : summary.pressureReasons[0]?.explanation ?? 'No derived reasoning signal is available yet.'}
        </p>
      </div>
    </section>
  )
}
