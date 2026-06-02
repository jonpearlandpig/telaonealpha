import type { OperationalPressureReason } from '@/lib/showtela/reasoning'

const SEVERITY_TONE: Record<OperationalPressureReason['severity'], { bg: string; text: string; dot: string; label: string }> = {
  low: { bg: '#EEF3EA', text: '#596D56', dot: '#8EA58E', label: 'Low' },
  moderate: { bg: '#F5EAD4', text: '#7A5B25', dot: '#C89B2F', label: 'Moderate' },
  high: { bg: '#F7DFCA', text: '#814D20', dot: '#D68A3A', label: 'High' },
  critical: { bg: '#F3D8D2', text: '#7C332A', dot: '#C85B4A', label: 'Critical' },
}

export function OperationalPressureCard({ reason }: { reason?: OperationalPressureReason }) {
  if (!reason) return null

  const tone = SEVERITY_TONE[reason.severity]
  const departments = reason.affectedDepartments.slice(0, 3).join(' / ') || 'General'

  return (
    <section className="rounded-[22px] border border-[#E5D8C7] bg-[#FFFDF8] px-4 py-4 shadow-[0_10px_26px_rgba(27,22,16,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9A7C46]">Why Pressure Exists</p>
          <h2 className="mt-1 text-[17px] font-semibold leading-tight text-[#17130F]">{reason.category}</h2>
        </div>
        <span className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ backgroundColor: tone.bg, color: tone.text }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tone.dot }} />
          {tone.label}
        </span>
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-[#5E5348]">{reason.explanation}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-[14px] bg-[#F6F0E7] px-3 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#9A825F]">Departments</p>
          <p className="mt-1 line-clamp-1 text-[12px] font-semibold text-[#2A231B]">{departments}</p>
        </div>
        <div className="rounded-[14px] bg-[#F6F0E7] px-3 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#9A825F]">Open Items</p>
          <p className="mt-1 text-[12px] font-semibold text-[#2A231B]">{reason.unresolvedCount}</p>
        </div>
      </div>
    </section>
  )
}
