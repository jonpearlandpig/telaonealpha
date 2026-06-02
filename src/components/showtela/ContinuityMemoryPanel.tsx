import type { ContinuityMemorySummary } from '@/lib/showtela/lineage'

const MEMORY_TONE: Record<ContinuityMemorySummary['memoryState'], { bg: string; text: string; label: string }> = {
  stable: { bg: '#EEF3EA', text: '#596D56', label: 'Stable' },
  shifting: { bg: '#F3EADB', text: '#725F43', label: 'Shifting' },
  drifting: { bg: '#F7DFCA', text: '#814D20', label: 'Drifting' },
  volatile: { bg: '#F3D8D2', text: '#7C332A', label: 'Volatile' },
}

function listLine(items: string[], fallback: string) {
  return items.slice(0, 2).join(' / ') || fallback
}

export function ContinuityMemoryPanel({ memory }: { memory: ContinuityMemorySummary }) {
  const tone = MEMORY_TONE[memory.memoryState]

  return (
    <section className="rounded-[24px] border border-[#D8C59D] bg-[#17130F] px-4 py-4 text-[#F8F1E2] shadow-[0_18px_38px_rgba(20,16,12,0.18)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#D7BC7F]">Saved Updates</p>
          <h2 className="mt-1 text-[18px] font-semibold leading-tight">Show memory</h2>
        </div>
        <span className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ backgroundColor: tone.bg, color: tone.text }}>
          {tone.label}
        </span>
      </div>

      <p className="mt-3 text-[12px] leading-relaxed text-[#D8CDB8]">{memory.continuityMovement}</p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-[14px] border border-white/10 bg-white/[0.06] px-3 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#B7A889]">Shifts</p>
          <p className="mt-1 text-[12px] font-semibold">{memory.recentShifts.length}</p>
        </div>
        <div className="rounded-[14px] border border-white/10 bg-white/[0.06] px-3 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#B7A889]">Escalations</p>
          <p className="mt-1 text-[12px] font-semibold">{memory.escalationHistory.length}</p>
        </div>
        <div className="rounded-[14px] border border-white/10 bg-white/[0.06] px-3 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#B7A889]">Repeated</p>
          <p className="mt-1 line-clamp-1 text-[12px] font-semibold">{listLine(memory.repeatedUnresolvedAreas, 'None')}</p>
        </div>
        <div className="rounded-[14px] border border-white/10 bg-white/[0.06] px-3 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#B7A889]">Volatile</p>
          <p className="mt-1 line-clamp-1 text-[12px] font-semibold">{memory.mostVolatileOperationalArea ?? 'No area'}</p>
        </div>
      </div>

      <div className="mt-4 rounded-[16px] border border-[#D7BC7F]/20 bg-[#241C14] px-3 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#D7BC7F]">Movement</p>
        <p className="mt-1 text-[12px] leading-relaxed text-[#D8CDB8]">{memory.operationalVolatility}</p>
      </div>
    </section>
  )
}
