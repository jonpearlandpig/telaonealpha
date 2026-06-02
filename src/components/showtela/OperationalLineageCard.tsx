import type { OperationalLineageEvent } from '@/lib/showtela/lineage'

const IMPACT_TONE: Record<OperationalLineageEvent['continuityImpact'], { bg: string; text: string; label: string }> = {
  minimal: { bg: '#EEF3EA', text: '#596D56', label: 'Minimal' },
  moderate: { bg: '#F5EAD4', text: '#7A5B25', label: 'Moderate' },
  significant: { bg: '#F7DFCA', text: '#814D20', label: 'Significant' },
  critical: { bg: '#F3D8D2', text: '#7C332A', label: 'Critical' },
}

const CHANGE_LABEL: Record<OperationalLineageEvent['eventType'], string> = {
  created: 'Created',
  updated: 'Updated',
  resolved: 'Stabilized',
  escalated: 'Escalated',
  blocked: 'Blocked',
  delayed: 'Delayed',
  reassigned: 'Reassigned',
  stale: 'Stale',
}

export function OperationalLineageCard({ event }: { event?: OperationalLineageEvent }) {
  if (!event) {
    return (
      <section className="rounded-[22px] border border-dashed border-[#D6C9B7] px-4 py-5 text-center">
        <p className="text-[13px] font-semibold text-[#6B5D4B]">No source movement yet.</p>
        <p className="mt-1 text-[12px] leading-relaxed text-[#8B847B]">Saved history will appear when updates, pressure, or open items move.</p>
      </section>
    )
  }

  const tone = IMPACT_TONE[event.continuityImpact]

  return (
    <section className="rounded-[22px] border border-[#E5D8C7] bg-[#FFFDF8] px-4 py-4 shadow-[0_10px_26px_rgba(27,22,16,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9A7C46]">Source History</p>
          <h2 className="mt-1 text-[17px] font-semibold leading-tight text-[#17130F]">{CHANGE_LABEL[event.eventType]}</h2>
        </div>
        <span className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ backgroundColor: tone.bg, color: tone.text }}>
          {tone.label}
        </span>
      </div>

      <p className="mt-3 text-[13px] leading-relaxed text-[#5E5348]">{event.lineageSummary}</p>
      <p className="mt-2 text-[12px] leading-relaxed text-[#7A6C5C]">{event.operationalReason}</p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-[14px] bg-[#F6F0E7] px-3 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#9A825F]">Area</p>
          <p className="mt-1 line-clamp-1 text-[12px] font-semibold text-[#2A231B]">{event.affectedDepartment}</p>
        </div>
        <div className="rounded-[14px] bg-[#F6F0E7] px-3 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#9A825F]">Open Delta</p>
          <p className="mt-1 text-[12px] font-semibold text-[#2A231B]">{event.unresolvedDelta}</p>
        </div>
      </div>

      <div className="mt-3 rounded-[16px] border border-[#E3D3B8] bg-[#FBF5EA] px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9A7C46]">Cause</p>
        <p className="mt-1 text-[12px] leading-relaxed text-[#5B4D3D]">
          {event.previousState} to {event.nextState} / {event.linkedDependencies.length} linked dependencies
        </p>
        <p className="mt-1 line-clamp-1 text-[10px] text-[#8B7C68]">{event.actorPlaceholder}</p>
      </div>
    </section>
  )
}
