import type { PressureEvolutionAnalysis } from '@/lib/showtela/lineage'

const STATE_LABEL: Record<string, string> = {
  calm: 'Calm',
  active: 'Active',
  pressure: 'Pressure',
  critical: 'Critical',
  waiting: 'Waiting',
  needs_decision: 'Needs Decision',
  tela_ready: 'TELA Ready',
  fresh: 'Fresh',
  aging: 'Aging',
  stale: 'Stale',
  unknown: 'Unknown',
}

function listLine(items: string[], fallback: string) {
  return items.slice(0, 3).join(' / ') || fallback
}

export function PressureEvolutionCard({ evolution }: { evolution: PressureEvolutionAnalysis }) {
  return (
    <section className="rounded-[22px] border border-[#E5D8C7] bg-[#FFFDF8] px-4 py-4 shadow-[0_10px_26px_rgba(27,22,16,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9A7C46]">Pressure Evolution</p>
          <h2 className="mt-1 text-[17px] font-semibold leading-tight text-[#17130F]">How pressure moved</h2>
        </div>
        <span className="rounded-full bg-[#F1E6D4] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#7D6132]">
          Derived
        </span>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="rounded-[16px] bg-[#F6F0E7] px-3 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#9A825F]">Initial</p>
          <p className="mt-1 text-[13px] font-semibold text-[#2A231B]">{STATE_LABEL[evolution.initialPressure]}</p>
        </div>
        <span className="h-px flex-1 bg-[#D8C7A6]" />
        <div className="rounded-[16px] bg-[#17130F] px-3 py-2 text-[#F8F1E2]">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#D7BC7F]">Current</p>
          <p className="mt-1 text-[13px] font-semibold">{STATE_LABEL[evolution.currentPressure]}</p>
        </div>
      </div>

      <p className="mt-3 text-[13px] leading-relaxed text-[#5E5348]">{evolution.operationalSummary}</p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-[14px] bg-[#F6F0E7] px-3 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#9A825F]">Drivers</p>
          <p className="mt-1 line-clamp-1 text-[12px] font-semibold text-[#2A231B]">{listLine(evolution.escalationDrivers, 'No escalation')}</p>
        </div>
        <div className="rounded-[14px] bg-[#F6F0E7] px-3 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#9A825F]">Drift</p>
          <p className="mt-1 text-[12px] font-semibold text-[#2A231B]">{STATE_LABEL[evolution.continuityDrift]}</p>
        </div>
      </div>
    </section>
  )
}
