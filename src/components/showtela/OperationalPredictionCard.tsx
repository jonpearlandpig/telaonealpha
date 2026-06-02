import type { OperationalCalendarEvent } from '@/lib/showtela/calendar'
import type { OperationalPrediction } from '@/lib/showtela/prediction'

const RISK_TONE: Record<OperationalPrediction['riskLevel'], { bg: string; text: string; label: string }> = {
  stable: { bg: '#EEF3EA', text: '#596D56', label: 'Stable' },
  watch: { bg: '#F3EADB', text: '#725F43', label: 'Watch' },
  elevated: { bg: '#F5EAD4', text: '#7A5B25', label: 'Elevated' },
  high: { bg: '#F7DFCA', text: '#814D20', label: 'High' },
  critical: { bg: '#F3D8D2', text: '#7C332A', label: 'Critical' },
}

function eventNames(events: OperationalCalendarEvent[], ids: string[]) {
  const names = ids
    .map((id) => events.find((event) => event.id === id)?.title)
    .filter(Boolean) as string[]
  return names.slice(0, 2).join(' / ') || 'Show watch'
}

export function OperationalPredictionCard({
  prediction,
  events,
}: {
  prediction: OperationalPrediction
  events: OperationalCalendarEvent[]
}) {
  const tone = RISK_TONE[prediction.riskLevel]
  const departments = prediction.affectedDepartments.slice(0, 3).join(' / ') || 'General'

  return (
    <section className="rounded-[22px] border border-[#E5D8C7] bg-[#FFFDF8] px-4 py-4 shadow-[0_10px_26px_rgba(27,22,16,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9A7C46]">Prediction</p>
          <h2 className="mt-1 text-[17px] font-semibold leading-tight text-[#17130F]">{prediction.predictionType}</h2>
        </div>
        <span className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ backgroundColor: tone.bg, color: tone.text }}>
          {tone.label}
        </span>
      </div>

      <p className="mt-3 text-[13px] leading-relaxed text-[#5E5348]">{prediction.predictionReason}</p>
      <p className="mt-2 text-[12px] leading-relaxed text-[#7A6C5C]">{prediction.operationalImpact}</p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-[14px] bg-[#F6F0E7] px-3 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#9A825F]">Departments</p>
          <p className="mt-1 line-clamp-1 text-[12px] font-semibold text-[#2A231B]">{departments}</p>
        </div>
        <div className="rounded-[14px] bg-[#F6F0E7] px-3 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#9A825F]">Likelihood</p>
          <p className="mt-1 text-[12px] font-semibold text-[#2A231B]">{Math.round(prediction.likelihood * 100)}% likely</p>
        </div>
      </div>

      <div className="mt-3 rounded-[16px] border border-[#E3D3B8] bg-[#FBF5EA] px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9A7C46]">Focus</p>
        <p className="mt-1 text-[12px] leading-relaxed text-[#5B4D3D]">{prediction.recommendedFocus}</p>
        <p className="mt-1 line-clamp-1 text-[10px] text-[#8B7C68]">{eventNames(events, prediction.affectedEvents)}</p>
      </div>
    </section>
  )
}
