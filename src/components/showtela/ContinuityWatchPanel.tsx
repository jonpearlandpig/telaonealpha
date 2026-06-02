import type { ContinuityWatchAnalysis } from '@/lib/showtela/prediction'

const WATCH_TONE: Record<ContinuityWatchAnalysis['watchState'], { bg: string; text: string; label: string }> = {
  healthy: { bg: '#EEF3EA', text: '#596D56', label: 'Healthy' },
  aging: { bg: '#F5EAD4', text: '#7A5B25', label: 'Aging' },
  drifting: { bg: '#F7DFCA', text: '#814D20', label: 'Drifting' },
  unstable: { bg: '#F3D8D2', text: '#7C332A', label: 'Unstable' },
}

function listLine(items: string[], fallback: string) {
  return items.slice(0, 2).join(' / ') || fallback
}

export function ContinuityWatchPanel({ watch }: { watch: ContinuityWatchAnalysis }) {
  const tone = WATCH_TONE[watch.watchState]

  return (
    <section className="rounded-[24px] border border-[#D8C59D] bg-[#17130F] px-4 py-4 text-[#F8F1E2] shadow-[0_18px_38px_rgba(20,16,12,0.18)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#D7BC7F]">Update Watch</p>
          <h2 className="mt-1 text-[18px] font-semibold leading-tight">Show heartbeat</h2>
        </div>
        <span className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ backgroundColor: tone.bg, color: tone.text }}>
          {tone.label}
        </span>
      </div>

      <p className="mt-3 text-[12px] leading-relaxed text-[#D8CDB8]">{watch.recommendation}</p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-[14px] border border-white/10 bg-white/[0.06] px-3 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#B7A889]">Unresolved</p>
          <p className="mt-1 text-[12px] font-semibold">{watch.unresolvedTrend}</p>
        </div>
        <div className="rounded-[14px] border border-white/10 bg-white/[0.06] px-3 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#B7A889]">Aging</p>
          <p className="mt-1 text-[12px] font-semibold">{watch.continuityDecay}</p>
        </div>
        <div className="rounded-[14px] border border-white/10 bg-white/[0.06] px-3 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#B7A889]">Silence</p>
          <p className="mt-1 line-clamp-1 text-[12px] font-semibold">{listLine(watch.operationalSilence, 'No silence')}</p>
        </div>
        <div className="rounded-[14px] border border-white/10 bg-white/[0.06] px-3 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#B7A889]">Blocked</p>
          <p className="mt-1 line-clamp-1 text-[12px] font-semibold">{listLine(watch.blockedDependencies, 'None')}</p>
        </div>
      </div>

      <div className="mt-4 rounded-[16px] border border-[#D7BC7F]/20 bg-[#241C14] px-3 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#D7BC7F]">Upcoming Risk</p>
        <p className="mt-1 text-[12px] leading-relaxed text-[#D8CDB8]">{listLine(watch.upcomingRisk, 'No upcoming risk yet.')}</p>
      </div>
    </section>
  )
}
