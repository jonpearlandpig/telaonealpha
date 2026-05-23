import type { ContinuityDriftAnalysis } from '@/lib/showtela/reasoning'

const DRIFT_TONE: Record<ContinuityDriftAnalysis['driftLevel'], { bg: string; text: string; label: string }> = {
  stable: { bg: '#EEF3EA', text: '#596D56', label: 'Stable' },
  aging: { bg: '#F5EAD4', text: '#7A5B25', label: 'Aging' },
  stale: { bg: '#F7DFCA', text: '#814D20', label: 'Stale' },
  critical: { bg: '#F3D8D2', text: '#7C332A', label: 'Critical' },
}

export function ContinuityDriftCard({ drift }: { drift: ContinuityDriftAnalysis }) {
  const tone = DRIFT_TONE[drift.driftLevel]
  const staleLine = drift.staleItems.slice(0, 2).join(' / ') || 'No stale items'
  const ownershipLine = drift.missingOwnership.slice(0, 2).join(' / ') || 'Ownership clear'
  const untouchedLine = drift.untouchedAreas.slice(0, 2).join(' / ') || 'No untouched area detected'

  return (
    <section className="rounded-[22px] border border-[#E5D8C7] bg-[#FFFDF8] px-4 py-4 shadow-[0_10px_26px_rgba(27,22,16,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9A7C46]">Continuity Drift</p>
          <h2 className="mt-1 text-[17px] font-semibold leading-tight text-[#17130F]">{drift.operationalRiskSummary}</h2>
        </div>
        <span className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ backgroundColor: tone.bg, color: tone.text }}>
          {tone.label}
        </span>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        <div className="rounded-[14px] bg-[#F6F0E7] px-3 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#9A825F]">Stale</p>
          <p className="mt-1 line-clamp-1 text-[12px] font-semibold text-[#2A231B]">{staleLine}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-[14px] bg-[#F6F0E7] px-3 py-2">
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#9A825F]">Ownership</p>
            <p className="mt-1 line-clamp-1 text-[12px] font-semibold text-[#2A231B]">{ownershipLine}</p>
          </div>
          <div className="rounded-[14px] bg-[#F6F0E7] px-3 py-2">
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#9A825F]">Untouched</p>
            <p className="mt-1 line-clamp-1 text-[12px] font-semibold text-[#2A231B]">{untouchedLine}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
