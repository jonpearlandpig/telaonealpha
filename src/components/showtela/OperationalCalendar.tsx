'use client'

import { useMemo, useState } from 'react'
import type { OperationalCalendarEvent, OperationalWeekDay } from '@/lib/showtela/calendar'
import { buildReasoningSummary } from '@/lib/showtela/reasoning'
import { TelaCalendarActionPanel } from './TelaCalendarActionPanel'
import { TelaReasoningPanel } from './TelaReasoningPanel'
import { BottomSheet } from './sheets/BottomSheet'
import { getWeekDays } from '@/lib/showtela/calendar'
import { buildTrustStatus } from './calendarTrust'

const STATE_LABELS: Record<string, string> = {
  calm: 'Calm',
  active: 'Active',
  pressure: 'Needs A Check',
  critical: 'Attention Needed',
  waiting: 'Watching',
  needs_decision: 'Needs Review',
  tela_ready: 'Active',
}

const STATE_TONES: Record<
  string,
  { badgeBg: string; badgeText: string; panelBg: string; panelBorder: string; accent: string }
> = {
  calm: { badgeBg: '#EEF3EA', badgeText: '#596D56', panelBg: '#FBFCF9', panelBorder: '#DCE6D4', accent: '#8EA58E' },
  active: { badgeBg: '#F3EADB', badgeText: '#725F43', panelBg: '#FFF9EF', panelBorder: '#E6D7B8', accent: '#C89B2F' },
  pressure: { badgeBg: '#F7DFCA', badgeText: '#814D20', panelBg: '#FFF6ED', panelBorder: '#E7C9A7', accent: '#D68A3A' },
  critical: { badgeBg: '#F3D8D2', badgeText: '#7C332A', panelBg: '#FFF5F3', panelBorder: '#E7C0B8', accent: '#C85B4A' },
  waiting: { badgeBg: '#ECE7DF', badgeText: '#625B54', panelBg: '#FCFBF8', panelBorder: '#DED6CA', accent: '#8B847B' },
  needs_decision: { badgeBg: '#F5E2CD', badgeText: '#7A481C', panelBg: '#FFF7EF', panelBorder: '#E6C9A7', accent: '#B7772D' },
  tela_ready: { badgeBg: '#DCEDE8', badgeText: '#174E46', panelBg: '#F4FBF8', panelBorder: '#C7E0D8', accent: '#1F6B5F' },
}

function buildOperationalSentence(event?: OperationalCalendarEvent) {
  if (!event) return 'The day is mostly stable right now.'
  if (event.summary) return event.summary
  if (event.telaHint) return event.telaHint
  if (event.unresolvedCount > 0) return `${event.title} still needs confirmation.`
  return `${event.title} is the clearest thing to keep in view.`
}

function buildDaySummary(event?: OperationalCalendarEvent, unresolvedCount = 0) {
  if (!event && unresolvedCount === 0) return 'No active blockers.'
  if (!event) return 'Quiet prep day.'
  if (event.type === 'hospitality' && unresolvedCount > 0) return 'Waiting on meal counts.'
  if (event.type === 'travel' && unresolvedCount > 0) return 'Travel still needs one final confirmation.'
  if (event.type === 'travel') return 'Travel finalized.'
  if (event.type === 'venue' && unresolvedCount > 0) return 'Venue timing still needs a final check.'
  if (event.type === 'venue') return 'Venue timing looks settled.'
  if ((event.type === 'show' || event.type === 'production') && unresolvedCount > 0) return 'Load-in still has one open thread.'
  if (event.type === 'show' || event.type === 'production') return 'Load-in confirmed.'
  if (event.type === 'staffing' && unresolvedCount > 0) return 'Crew pacing needs one more check.'
  if (event.type === 'staffing') return 'Crew pacing looks healthy.'
  if (event.unresolvedCount > 0) return `${event.title} still needs a final confirmation.`
  return buildOperationalSentence(event)
}

function buildChangeSummary(event?: OperationalCalendarEvent) {
  if (!event) return 'Nothing material has shifted since the last update.'
  if (event.continuityState === 'fresh') return 'A fresh update came in and the plan still looks intact.'
  if (event.unresolvedCount > 0) return 'One open detail is still shaping the day.'
  if (event.people.length === 0) return 'Ownership still needs to be made explicit.'
  return 'The plan is holding without a major shift.'
}

function buildNextAction(event?: OperationalCalendarEvent, fallback?: string) {
  if (fallback) return fallback
  if (!event) return 'Stay with the current plan and check again later.'
  if (event.unresolvedCount > 0 || ['critical', 'needs_decision', 'pressure'].includes(event.pressureState)) {
    if (event.type === 'travel') return 'Confirm it before travel finalizes.'
    if (event.type === 'venue') return 'Confirm it before load-in compresses.'
    if (event.type === 'hospitality') return 'Confirm it before catering locks.'
    return `Confirm the open detail around ${event.title.toLowerCase()} before tomorrow tightens.`
  }
  if (event.people.length === 0) return `Assign a clear owner for ${event.title.toLowerCase()}.`
  if (event.continuityState === 'stale') return `Refresh the latest context for ${event.title.toLowerCase()}.`
  return `Keep ${event.title.toLowerCase()} on track and watch for changes.`
}

function buildWeekRailLine(day: OperationalWeekDay) {
  const event = day.nextEvent
  if (!event && day.events.length === 0) return day.label === 'SUN' ? 'No active blockers' : 'Quiet prep day'
  if (!event) return 'Holding steady'
  if (event.type === 'hospitality' && event.unresolvedCount > 0) return 'Waiting on meal counts'
  if (event.type === 'travel' && event.unresolvedCount > 0) return 'Travel still open'
  if (event.type === 'travel') return 'Travel finalized'
  if (event.type === 'venue' && event.unresolvedCount > 0) return 'Venue timing shifted'
  if (event.type === 'venue') return 'Venue timing settled'
  if ((event.type === 'show' || event.type === 'production') && event.unresolvedCount > 0) return 'Load-in still moving'
  if (event.type === 'show' || event.type === 'production') return 'Load-in confirmed'
  if (event.type === 'staffing' && event.unresolvedCount > 0) return 'Crew pacing needs care'
  if (event.type === 'staffing') return 'Crew pacing looks healthy'
  if (event.unresolvedCount > 0) return 'Final detail still open'
  if (event.continuityState === 'fresh') return 'Freshly confirmed'
  return event.title
}

function buildTimingLine(event?: OperationalCalendarEvent, day?: OperationalWeekDay) {
  if (!event?.timestamp) return day?.fullLabel ?? 'Timing is still open.'
  const date = new Date(event.timestamp)
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace(' AM', 'A').replace(' PM', 'P')
  return `${day?.fullLabel ?? date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} at ${time}`
}

function buildStillOpenLine(event?: OperationalCalendarEvent) {
  if (!event) return 'Nothing is asking for extra care right now.'
  if (event.unresolvedCount > 0) return `${event.unresolvedCount} detail${event.unresolvedCount === 1 ? '' : 's'} still need confirmation.`
  if (event.people.length === 0) return 'A clear owner still needs to be named.'
  if (event.continuityState === 'stale') return 'This would benefit from a fresh update before tomorrow.'
  return 'Nothing here looks like it is slipping.'
}

export function OperationalCalendar({
  events,
  baseDate,
  onOpenVoice,
  diagnosticState,
  lastHydratedAt,
}: {
  events: OperationalCalendarEvent[]
  baseDate?: Date
  onOpenVoice?: () => void
  diagnosticState?: string
  lastHydratedAt?: string
}) {
  const days = useMemo(() => getWeekDays(baseDate, events), [baseDate, events])
  const [selectedDayKey, setSelectedDayKey] = useState(() => days[0]?.key ?? '')
  const [showTelaWhy, setShowTelaWhy] = useState(false)
  const resolvedDayKey = days.some((day) => day.key === selectedDayKey) ? selectedDayKey : days[0]?.key ?? ''
  const selectedDay = days.find((day) => day.key === resolvedDayKey) ?? days[0]
  const selectedEvents = selectedDay?.events ?? []
  const selectedEvent = selectedEvents[0]
  const reasoningScope = selectedEvents.length > 0 ? selectedEvents : events
  const reasoning = useMemo(
    () => buildReasoningSummary(reasoningScope, selectedDay?.key ?? resolvedDayKey),
    [reasoningScope, resolvedDayKey, selectedDay?.key],
  )
  const briefingEvent = selectedDay?.nextEvent ?? selectedEvent
  const focusEvent = reasoning.highestPressureEvent ?? briefingEvent
  const dayState = focusEvent?.pressureState ?? selectedDay?.state ?? 'calm'
  const dayTone = STATE_TONES[dayState] ?? STATE_TONES.calm
  const daySummary = buildDaySummary(focusEvent, selectedDay?.unresolvedCount ?? 0)
  const changeSummary = buildChangeSummary(focusEvent)
  const nextActionText = buildNextAction(focusEvent, reasoning.recommendedFocus)
  const trustLine = buildTrustStatus({ diagnosticState, event: focusEvent, lastHydratedAt })

  return (
    <div className="min-h-screen bg-[#F8F6F2] pb-8">
      <header className="bg-[#F8F6F2] px-5 pb-1 pt-14">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9A7C46]">Crusade Calendar</p>
      </header>

      <section className="pt-3">
        <div className="mb-3 flex items-center justify-between px-5">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7C705F]">This Week</h2>
          <button
            type="button"
            onClick={onOpenVoice}
            className="min-h-[36px] rounded-full bg-[#FBF6EC] px-3 text-[11px] font-semibold text-[#8A6725]"
          >
            Add note
          </button>
        </div>
        <div className="flex gap-2.5 overflow-x-auto px-5 pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {days.map((day) => {
            const selected = day.key === selectedDay?.key
            return (
              <button
                key={day.key}
                type="button"
                onClick={() => setSelectedDayKey(day.key)}
                className={`w-[80px] flex-shrink-0 rounded-[24px] px-3 py-3 text-left transition-colors ${selected ? 'bg-[#F1EADF] text-[#17130F]' : 'bg-[#FCFAF5] text-[#4F463D]'}`}
              >
                <p className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${selected ? 'text-[#8A6725]' : 'text-[#8A7D6E]'}`}>{day.label}</p>
                <p className="mt-1 text-[24px] font-semibold leading-none">{day.dateLabel}</p>
                <p className={`mt-2 line-clamp-2 text-[11px] leading-snug ${selected ? 'text-[#4F463D]' : 'text-[#7B7064]'}`}>
                  {buildWeekRailLine(day)}
                </p>
              </button>
            )
          })}
        </div>
      </section>

      <section className="px-5 pt-6">
        <div
          className="rounded-[32px] border px-5 py-6 shadow-[0_12px_30px_rgba(27,22,16,0.04)]"
          style={{ backgroundColor: dayTone.panelBg, borderColor: dayTone.panelBorder }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9A7C46]">Daily Briefing</p>
              <h2 className="mt-1 text-[24px] font-semibold leading-tight text-[#17130F]">{selectedDay?.fullLabel}</h2>
              <p className="mt-2 text-[11px] text-[#9A8A76]">{trustLine}</p>
            </div>
            <span
              className="rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]"
              style={{ backgroundColor: dayTone.badgeBg, color: dayTone.badgeText }}
            >
              {STATE_LABELS[dayState]}
            </span>
          </div>

          <p className="mt-8 text-[24px] font-semibold leading-tight text-[#17130F]">{daySummary}</p>
          <p className="mt-4 max-w-[30ch] text-[14px] leading-relaxed text-[#5E5348]">{changeSummary}</p>

          <div className="mt-8 rounded-[22px] bg-white/58 px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9A7C46]">Next Move</p>
            <p className="mt-2 text-[14px] leading-relaxed text-[#3E352C]">{nextActionText}</p>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-3">
            <div className="rounded-[18px] bg-white/46 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9A7C46]">Timing</p>
              <p className="mt-1 text-[12px] leading-relaxed text-[#4F463D]">{buildTimingLine(focusEvent, selectedDay)}</p>
            </div>
            <div className="rounded-[18px] bg-white/46 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9A7C46]">Status</p>
              <p className="mt-1 text-[12px] leading-relaxed text-[#4F463D]">{buildStillOpenLine(focusEvent)}</p>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setShowTelaWhy(true)}
              className="min-h-[40px] rounded-full bg-white/64 px-4 text-[12px] font-semibold text-[#7A6643]"
            >
              TELAwhy
            </button>
            <div className="flex min-w-0 items-center gap-2">
              <div className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: dayTone.accent }} />
              <p className="truncate text-[12px] text-[#6B5D4B]">{focusEvent?.title ?? 'No major change in view'}</p>
            </div>
          </div>
        </div>
      </section>

      <BottomSheet open={showTelaWhy} onClose={() => setShowTelaWhy(false)} title="TELAwhy">
        <div className="space-y-4">
          <div className="rounded-[20px] bg-[#FFFDF8] px-4 py-4 shadow-[0_8px_22px_rgba(27,22,16,0.04)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9A7C46]">Producer note</p>
            <p className="mt-2 text-[14px] leading-relaxed text-[#3E352C]">
              This layer explains why the day is leaning this way, who is carrying it, and where confidence is still soft.
            </p>
          </div>

          <TelaCalendarActionPanel selectedEvent={focusEvent} />
          <TelaReasoningPanel selectedEvent={focusEvent} summary={reasoning} diagnosticState={diagnosticState} lastHydratedAt={lastHydratedAt} />

          <section>
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5E5348]">What Still Needs Care</h2>
            <div className="flex flex-col gap-2">
              {selectedEvents.slice(0, 4).map((event) => (
                <div key={event.id} className="rounded-[18px] bg-[#FFFDF8] px-3 py-3 shadow-[0_8px_20px_rgba(27,22,16,0.04)]">
                  <p className="text-[12px] font-semibold text-[#17130F]">{event.title}</p>
                  <p className="mt-1 text-[11px] leading-snug text-[#6B5D4B]">{event.telaHint ?? buildOperationalSentence(event)}</p>
                </div>
              ))}
              {selectedEvents.length === 0 && (
                <p className="rounded-[18px] bg-[#FFFDF8] px-3 py-3 text-[12px] text-[#8B847B]">Nothing extra needs care on this day right now.</p>
              )}
            </div>
          </section>

          <section className="rounded-[22px] bg-[#FFFDF8] px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9A7C46]">What Changed</p>
            <div className="mt-3 flex flex-col gap-2">
              {selectedEvents.slice(0, 4).map((event) => (
                <div key={event.id} className="border-t border-[#F2EBE0] pt-2 first:border-t-0 first:pt-0">
                  <p className="line-clamp-1 text-[12px] font-semibold text-[#17130F]">{event.title}</p>
                  <p className="mt-0.5 text-[10px] text-[#8B847B]">{event.summary ?? 'No new shift has been written yet.'}</p>
                </div>
              ))}
              {selectedEvents.length === 0 && (
                <p className="text-[12px] text-[#8B847B]">No day-specific change is in view yet.</p>
              )}
            </div>
          </section>
        </div>
      </BottomSheet>
    </div>
  )
}
