import type { OperationalCalendarEvent } from '@/lib/showtela/calendar'
import type { OperationalPrediction } from '@/lib/showtela/prediction'

function dayKey(value: string) {
  return value.slice(0, 10)
}

function shortDay(key: string) {
  const date = new Date(`${key}T12:00:00`)
  if (Number.isNaN(date.getTime())) return key
  return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })
}

function riskForDay(events: OperationalCalendarEvent[], predictions: OperationalPrediction[], key: string) {
  const dayEvents = events.filter((event) => dayKey(event.timestamp) === key)
  const predictionHits = predictions.filter((prediction) => prediction.affectedEvents.some((id) => dayEvents.some((event) => event.id === id)))
  const unresolved = dayEvents.reduce((total, event) => total + event.unresolvedCount, 0)
  const decay = dayEvents.filter((event) => event.continuityState === 'aging' || event.continuityState === 'stale').length
  const blocked = predictionHits.filter((prediction) => prediction.riskLevel === 'high' || prediction.riskLevel === 'critical').length
  return { unresolved, decay, blocked, count: dayEvents.length }
}

export function OperationalRiskTimeline({
  events,
  predictions,
}: {
  events: OperationalCalendarEvent[]
  predictions: OperationalPrediction[]
}) {
  const keys = Array.from(new Set(events.map((event) => dayKey(event.timestamp)))).sort()

  return (
    <section className="rounded-[22px] border border-[#E5D8C7] bg-[#FFFDF8] px-4 py-4 shadow-[0_10px_26px_rgba(27,22,16,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9A7C46]">Risk Timeline</p>
          <h2 className="mt-1 text-[17px] font-semibold leading-tight text-[#17130F]">Upcoming pressure</h2>
        </div>
        <span className="rounded-full bg-[#F1E6D4] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#7D6132]">
          Estimated
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {keys.slice(0, 7).map((key) => {
          const risk = riskForDay(events, predictions, key)
          const score = risk.unresolved + risk.decay + risk.blocked
          const width = Math.min(100, Math.max(10, score * 18 + risk.count * 8))
          const color = score >= 5 ? '#C85B4A' : score >= 3 ? '#D68A3A' : score >= 1 ? '#C89B2F' : '#8EA58E'
          return (
            <div key={key} className="rounded-[15px] bg-[#F6F0E7] px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[12px] font-semibold text-[#2A231B]">{shortDay(key)}</p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8B7C68]">
                  {risk.unresolved} open / {risk.decay} aging
                </p>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-[#E3D8C9]">
                <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: color }} />
              </div>
            </div>
          )
        })}
        {keys.length === 0 && (
          <p className="rounded-[15px] bg-[#F6F0E7] px-3 py-3 text-[12px] text-[#8B847B]">No upcoming timeline risk yet.</p>
        )}
      </div>
    </section>
  )
}
