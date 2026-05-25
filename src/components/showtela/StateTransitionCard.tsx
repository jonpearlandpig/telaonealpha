import type { OperationalStateTransition } from '@/lib/showtela/lineage'

export function StateTransitionCard({ transition }: { transition?: OperationalStateTransition }) {
  if (!transition) {
    return (
      <section className="rounded-[22px] border border-dashed border-[#D6C9B7] px-4 py-5 text-center">
        <p className="text-[13px] font-semibold text-[#6B5D4B]">No state transition derived yet.</p>
        <p className="mt-1 text-[12px] leading-relaxed text-[#8B847B]">Transitions appear when pressure or continuity movement changes state.</p>
      </section>
    )
  }

  return (
    <section className="rounded-[22px] border border-[#E5D8C7] bg-[#FFFDF8] px-4 py-4 shadow-[0_10px_26px_rgba(27,22,16,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9A7C46]">State Transition</p>
          <h2 className="mt-1 text-[17px] font-semibold leading-tight text-[#17130F]">{transition.beforeState} to {transition.afterState}</h2>
        </div>
        <span className="rounded-full bg-[#F1E6D4] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#7D6132]">
          Shift {transition.pressureShift}
        </span>
      </div>

      <p className="mt-3 text-[13px] leading-relaxed text-[#5E5348]">{transition.transitionReason}</p>
      <p className="mt-2 text-[12px] leading-relaxed text-[#7A6C5C]">{transition.operationalEffect}</p>

      <div className="mt-3 rounded-[16px] border border-[#E3D3B8] bg-[#FBF5EA] px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9A7C46]">Continuity Shift</p>
        <p className="mt-1 text-[12px] leading-relaxed text-[#5B4D3D]">{transition.continuityShift} derived movement / {transition.eventId}</p>
      </div>
    </section>
  )
}
