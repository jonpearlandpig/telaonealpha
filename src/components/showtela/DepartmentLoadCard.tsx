import type { DepartmentLoadAnalysis } from '@/lib/showtela/prediction'

const LOAD_TONE: Record<DepartmentLoadAnalysis['loadState'], { bg: string; text: string; label: string }> = {
  balanced: { bg: '#EEF3EA', text: '#596D56', label: 'Balanced' },
  active: { bg: '#F3EADB', text: '#725F43', label: 'Active' },
  compressed: { bg: '#F7DFCA', text: '#814D20', label: 'Compressed' },
  overloaded: { bg: '#F3D8D2', text: '#7C332A', label: 'Overloaded' },
}

export function DepartmentLoadCard({ load }: { load: DepartmentLoadAnalysis }) {
  const tone = LOAD_TONE[load.loadState]

  return (
    <section className="rounded-[22px] border border-[#E5D8C7] bg-[#FFFDF8] px-4 py-4 shadow-[0_10px_26px_rgba(27,22,16,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9A7C46]">Department Load</p>
          <h2 className="mt-1 text-[17px] font-semibold leading-tight text-[#17130F]">{load.department}</h2>
        </div>
        <span className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ backgroundColor: tone.bg, color: tone.text }}>
          {tone.label}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-[14px] bg-[#F6F0E7] px-3 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#9A825F]">Events</p>
          <p className="mt-1 text-[14px] font-semibold text-[#2A231B]">{load.eventCount}</p>
        </div>
        <div className="rounded-[14px] bg-[#F6F0E7] px-3 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#9A825F]">Open</p>
          <p className="mt-1 text-[14px] font-semibold text-[#2A231B]">{load.unresolvedCount}</p>
        </div>
        <div className="rounded-[14px] bg-[#F6F0E7] px-3 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#9A825F]">Deps</p>
          <p className="mt-1 text-[14px] font-semibold text-[#2A231B]">{load.dependencyPressure}</p>
        </div>
      </div>

      <p className="mt-3 text-[12px] leading-relaxed text-[#5E5348]">
        Staffing {load.staffingRisk}, readiness {load.readinessRisk}, compression {load.compressionRisk}.
      </p>
      <p className="mt-1 text-[12px] leading-relaxed text-[#7A6C5C]">
        {load.loadState === 'overloaded'
          ? 'Reduce department ambiguity before adding more movement.'
          : load.loadState === 'compressed'
            ? 'Protect handoffs and confirm ownership.'
            : load.loadState === 'active'
              ? 'Keep updates fresh while load is moving.'
              : 'No load imbalance yet.'}
      </p>
    </section>
  )
}
