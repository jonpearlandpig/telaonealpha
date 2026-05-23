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
    <section className="rounded-[24px] border border-[#D8C59D] bg-[#17130F] px-4 py-4 text-[#F8F1E2] shadow-[0_18px_38px_rgba(20,16,12,0.18)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#D7BC7F]">TELA Reasoning</p>
          <h2 className="mt-1 text-[18px] font-semibold leading-tight">Operational awareness layer</h2>
        </div>
        <span className="rounded-full border border-[#D7BC7F]/35 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#E7D2A1]">
          Derived
        </span>
      </div>

      <p className="mt-3 text-[12px] leading-relaxed text-[#D8CDB8]">{summary.recommendedFocus}</p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-[14px] border border-white/10 bg-white/[0.06] px-3 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#B7A889]">Blocked Dept</p>
          <p className="mt-1 line-clamp-1 text-[12px] font-semibold">{summary.mostBlockedDepartment ?? 'None detected'}</p>
        </div>
        <div className="rounded-[14px] border border-white/10 bg-white/[0.06] px-3 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#B7A889]">Highest Risk</p>
          <p className="mt-1 line-clamp-1 text-[12px] font-semibold">{titleFor(summary.highestPressureEvent)}</p>
        </div>
        <div className="rounded-[14px] border border-white/10 bg-white/[0.06] px-3 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#B7A889]">Oldest Open</p>
          <p className="mt-1 line-clamp-1 text-[12px] font-semibold">{titleFor(summary.oldestUnresolvedItem)}</p>
        </div>
        <div className="rounded-[14px] border border-white/10 bg-white/[0.06] px-3 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#B7A889]">Drift</p>
          <p className="mt-1 line-clamp-1 text-[12px] font-semibold capitalize">{summary.drift.driftLevel}</p>
        </div>
      </div>

      <div className="mt-4 rounded-[16px] border border-[#D7BC7F]/20 bg-[#241C14] px-3 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#D7BC7F]">Why This Matters</p>
        <p className="mt-1 text-[12px] leading-relaxed text-[#D8CDB8]">
          {keyDependency
            ? `${keyDependency.department} is the clearest dependency signal because ${keyDependency.dependencyReason.toLowerCase()}`
            : summary.pressureReasons[0]?.explanation ?? 'No derived reasoning signal is available yet.'}
        </p>
      </div>
    </section>
  )
}
