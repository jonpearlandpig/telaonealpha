import type { OperationalCalendarEvent } from '@/lib/showtela/calendar'
import type { OperationalDependency } from '@/lib/showtela/reasoning'

const STATUS_LABEL: Record<OperationalDependency['status'], string> = {
  clear: 'Clear',
  blocked: 'Blocked',
  at_risk: 'At Risk',
  waiting: 'Waiting',
}

function eventTitle(events: OperationalCalendarEvent[], id?: string) {
  return events.find((event) => event.id === id)?.title ?? 'Open dependency'
}

export function DependencyChainCard({
  dependency,
  events,
}: {
  dependency?: OperationalDependency
  events: OperationalCalendarEvent[]
}) {
  if (!dependency) {
    return (
      <section className="rounded-[22px] border border-dashed border-[#D6C9B7] px-4 py-5 text-center">
        <p className="text-[13px] font-semibold text-[#6B5D4B]">No dependency chain derived yet.</p>
        <p className="mt-1 text-[12px] leading-relaxed text-[#8B847B]">Sequencing appears clear until more operational events arrive.</p>
      </section>
    )
  }

  return (
    <section className="rounded-[22px] border border-[#E5D8C7] bg-[#FFFDF8] px-4 py-4 shadow-[0_10px_26px_rgba(27,22,16,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9A7C46]">Key Dependency</p>
          <h2 className="mt-1 text-[17px] font-semibold leading-tight text-[#17130F]">{dependency.department}</h2>
        </div>
        <span className="rounded-full bg-[#F1E6D4] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#7D6132]">
          {STATUS_LABEL[dependency.status]}
        </span>
      </div>

      <div className="mt-4 flex items-stretch gap-3">
        <div className="flex w-5 flex-shrink-0 flex-col items-center">
          <span className="h-2.5 w-2.5 rounded-full bg-[#C89B2F]" />
          <span className="my-1 w-px flex-1 bg-[#D8C7A6]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#17130F]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 text-[13px] font-semibold text-[#17130F]">{eventTitle(events, dependency.sourceEventId)}</p>
          <p className="mt-3 line-clamp-1 text-[13px] font-semibold text-[#17130F]">{eventTitle(events, dependency.targetEventId)}</p>
        </div>
      </div>

      <p className="mt-3 text-[12px] leading-relaxed text-[#5E5348]">{dependency.dependencyReason}</p>
      <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9A7C46]">
        Impact {dependency.unresolvedImpact} / Risk {dependency.operationalRisk}
      </p>
    </section>
  )
}
