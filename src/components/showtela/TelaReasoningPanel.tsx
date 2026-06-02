import type { OperationalCalendarEvent } from '@/lib/showtela/calendar'
import type { OperationalReasoningSummary } from '@/lib/showtela/reasoning'
import { buildTrustStatus } from './calendarTrust'

function titleFor(event?: OperationalCalendarEvent, fallback = 'Nothing specific is being held here yet.') {
  return event?.title ?? fallback
}

function buildWhoLine(event?: OperationalCalendarEvent, summary?: OperationalReasoningSummary) {
  const people = event?.people?.filter(Boolean) ?? []
  if (people.length > 0) return people.join(', ')
  if (summary?.mostBlockedDepartment) return summary.mostBlockedDepartment
  return 'No clear owner is named yet.'
}

function buildWhatLine(event?: OperationalCalendarEvent) {
  if (event?.summary) return event.summary
  if (event?.unresolvedCount) return `${event.title} is still waiting on a final detail.`
  return titleFor(event)
}

function buildWhenLine(event?: OperationalCalendarEvent) {
  if (!event?.timestamp) return 'Timing is still open.'
  const date = new Date(event.timestamp)
  const day = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
  const time = event.startTime
    ? new Date(event.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace(' AM', 'A').replace(' PM', 'P')
    : ''
  return time ? `${day} at ${time}` : day
}

function buildHowLine(summary: OperationalReasoningSummary) {
  if (summary.keyDependency) return summary.keyDependency.dependencyReason
  if (summary.pressureReasons[0]?.explanation) return summary.pressureReasons[0].explanation
  return 'This is the thread most likely to shape the day if it moves.'
}

function buildWhyLine(event: OperationalCalendarEvent | undefined, summary: OperationalReasoningSummary) {
  if (event?.unresolvedCount) return 'Another person or step is waiting on this to settle.'
  if (summary.drift.driftLevel === 'critical' || summary.drift.driftLevel === 'stale') return 'Timing confidence is starting to soften.'
  if (summary.drift.missingOwnership.length > 0) return 'A clear owner still needs to be named.'
  return 'This is the clearest thing affecting the day right now.'
}

export function TelaReasoningPanel({
  selectedEvent,
  summary,
  diagnosticState,
  lastHydratedAt,
}: {
  selectedEvent?: OperationalCalendarEvent
  summary: OperationalReasoningSummary
  diagnosticState?: string
  lastHydratedAt?: string
}) {
  const trustLine = buildTrustStatus({ diagnosticState, event: selectedEvent ?? summary.highestPressureEvent, lastHydratedAt })

  return (
    <section className="rounded-[24px] bg-[#FFF9F1] px-4 py-4 text-[#2C241C] shadow-[0_10px_24px_rgba(20,16,12,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9A7C46]">Why this matters</p>
          <h2 className="mt-1 text-[18px] font-semibold leading-tight">Why this matters today</h2>
        </div>
        <span className="text-[10px] text-[#9A8A76]">{trustLine}</span>
      </div>

      <p className="mt-3 text-[13px] leading-relaxed text-[#6B5D4B]">{summary.recommendedFocus}</p>

      <div className="mt-4 grid grid-cols-1 gap-2">
        <div className="rounded-[14px] bg-white/78 px-3 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#9A8A76]">Who</p>
          <p className="mt-1 text-[12px] font-semibold">{buildWhoLine(selectedEvent, summary)}</p>
        </div>
        <div className="rounded-[14px] bg-white/78 px-3 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#9A8A76]">What</p>
          <p className="mt-1 text-[12px] font-semibold">{buildWhatLine(selectedEvent ?? summary.highestPressureEvent)}</p>
        </div>
        <div className="rounded-[14px] bg-white/78 px-3 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#9A8A76]">When</p>
          <p className="mt-1 text-[12px] font-semibold">{buildWhenLine(selectedEvent ?? summary.highestPressureEvent)}</p>
        </div>
        <div className="rounded-[14px] bg-white/78 px-3 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#9A8A76]">How</p>
          <p className="mt-1 text-[12px] font-semibold">{buildHowLine(summary)}</p>
        </div>
      </div>

      <div className="mt-4 rounded-[16px] bg-[#FCF6EC] px-3 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9A7C46]">Why</p>
        <p className="mt-1 text-[12px] leading-relaxed text-[#6B5D4B]">{buildWhyLine(selectedEvent ?? summary.highestPressureEvent, summary)}</p>
      </div>
    </section>
  )
}
