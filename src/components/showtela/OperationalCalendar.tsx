'use client'

import { useMemo, useState } from 'react'
import type { OperationalCalendarEvent } from '@/lib/showtela/calendar'
import { formatOperationalTime, getWeekDays, getUnresolvedCount } from '@/lib/showtela/calendar'
import { CalendarEventCard } from './CalendarEventCard'
import { BottomSheet } from './sheets/BottomSheet'

const STATE_LABELS: Record<string, string> = {
  calm: 'Calm',
  active: 'Active',
  pressure: 'Needs A Check',
  critical: 'Attention Needed',
  waiting: 'Watching',
  needs_decision: 'Needs Review',
  tela_ready: 'Active',
}

function freshnessLabel(event?: OperationalCalendarEvent, lastHydratedAt?: string) {
  const reference = event?.freshnessTimestamp ?? event?.importedAt ?? lastHydratedAt
	  if (!reference) return 'Last update unavailable'
  try {
    const diff = Date.now() - new Date(reference).getTime()
    const minutes = Math.max(0, Math.floor(diff / 60000))
    if (minutes < 1) return 'Updated just now'
    if (minutes < 60) return `Last updated ${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `Last updated ${hours}h ago`
    return `No new updates since ${formatOperationalTime(reference)}`
  } catch {
	    return 'Last update unavailable'
  }
}

function trustLabel(event?: OperationalCalendarEvent, diagnosticState?: string) {
  if (event?.source === 'artifact') return event.sourceArtifactTitle ? `Imported from ${event.sourceArtifactTitle}` : 'Imported from uploaded source'
  if (event?.source === 'notion') return 'Synced from venue packet'
  if (event?.unresolvedCount) return 'Awaiting venue confirmation'
  if (event?.people[0]) return `Last confirmed by ${event.people[0]}`
  if (diagnosticState === 'persistence-stale') return 'Automation incomplete'
  return 'Human verification pending'
}

function whyLabel(event?: OperationalCalendarEvent) {
	  if (!event) return 'Details will appear when an event is selected.'
	  if (event.unresolvedCount > 0) return 'Open items can slow the room around this event.'
	  if (event.pressureState === 'critical' || event.pressureState === 'pressure') return 'This carries visible pressure and should stay close.'
	  return 'This keeps the team aligned before pressure spreads.'
}

function formatOperationalDateTime(value?: string) {
  if (!value) return ''
  try {
    return `${new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${formatOperationalTime(value)}`
  } catch {
    return ''
  }
}

function uniqueCount(values: string[][]) {
  return new Set(values.flat().filter(Boolean)).size
}

export function OperationalCalendar({
  events,
  baseDate,
  onOpenVoice,
  diagnosticState,
  lastHydratedAt,
  proofMode,
}: {
  events: OperationalCalendarEvent[]
  baseDate?: Date
  onOpenVoice?: () => void
  diagnosticState?: string
  lastHydratedAt?: string
  proofMode?: boolean
}) {
  const days = useMemo(() => getWeekDays(baseDate, events), [baseDate, events])
  const [selectedDayKey, setSelectedDayKey] = useState(() => days[0]?.key ?? '')
  const [showTelaWhy, setShowTelaWhy] = useState(false)

  const selectedDay = days.find((day) => day.key === selectedDayKey) ?? days[0]
  const selectedEvents = selectedDay?.events ?? []
  const selectedEvent = selectedEvents[0]
  const unresolvedCount = getUnresolvedCount(events)
  const primaryCount = events.length
  const nextMove = selectedEvent?.telaHint ?? selectedEvent?.summary ?? 'Hold current operating picture.'
  const trustSignal = trustLabel(selectedEvent, diagnosticState)
  const freshnessSignal = freshnessLabel(selectedEvent, lastHydratedAt)
  const displayedEvents = proofMode ? events : (selectedEvents.length > 0 ? selectedEvents.slice(0, 3) : events.slice(0, 3))
  const affectedCount = uniqueCount(events.map((event) => [...event.people, ...event.departments]))
  const nextEvent = displayedEvents[0] ?? selectedEvent

  return (
    <div className="min-h-screen bg-[#F8F6F2] pb-8">
      <header className="border-b border-[#EAE0D3] bg-[#F8F6F2] px-5 pb-5 pt-14">
	        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9A7C46]">Today And Next</p>
        <h1 className="mt-1 text-[26px] font-semibold leading-tight text-[#141210]">Calendar</h1>
        <p className="mt-2 max-w-[280px] text-[13px] leading-relaxed text-[#6B5D4B]">
          What is happening, what happens next, what is blocked, and who is affected.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {['Events', 'Milestones', 'Readiness', 'Dependencies'].map((source) => (
            <span key={source} className="rounded-full border border-[#E1D6C7] bg-[#FFFDF8] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8A7351]">
              {source}
            </span>
          ))}
        </div>
      </header>

      <section className="px-5 pt-5">
        <div className="grid grid-cols-4 gap-2">
          <div className="rounded-[18px] bg-[#17130F] px-3 py-3 text-[#F8F1E2]">
            <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[#D7BC7F]">Now</p>
            <p className="mt-1 text-[22px] font-semibold leading-none">{primaryCount}</p>
          </div>
          <div className="rounded-[18px] bg-[#FFFDF8] px-3 py-3 shadow-[0_8px_20px_rgba(27,22,16,0.05)]">
            <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[#9A7C46]">Blocked</p>
            <p className="mt-1 text-[22px] font-semibold leading-none text-[#17130F]">{unresolvedCount}</p>
          </div>
          <div className="rounded-[18px] bg-[#FFFDF8] px-3 py-3 shadow-[0_8px_20px_rgba(27,22,16,0.05)]">
            <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[#9A7C46]">Affected</p>
            <p className="mt-1 text-[22px] font-semibold leading-none text-[#17130F]">{affectedCount}</p>
          </div>
          <button
            type="button"
            onClick={onOpenVoice}
            className="rounded-[18px] bg-[#FFFDF8] px-3 py-3 text-left shadow-[0_8px_20px_rgba(27,22,16,0.05)]"
          >
            <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[#9A7C46]">Voice</p>
            <p className="mt-1 text-[16px] font-semibold leading-none text-[#17130F]">Ready</p>
          </button>
        </div>
      </section>

      <section className="pt-5">
        <div className="mb-3 flex items-center justify-between px-5">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5E5348]">Time horizon</h2>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8A7351]">{selectedDay?.fullLabel}</p>
        </div>
        <div className="flex gap-2 overflow-x-auto px-5 pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {days.map((day) => {
            const selected = day.key === selectedDay?.key
            return (
              <button
                key={day.key}
                type="button"
                onClick={() => setSelectedDayKey(day.key)}
                className={`min-h-[88px] w-[74px] flex-shrink-0 rounded-[22px] border px-2 py-2 text-left transition-[transform,box-shadow] duration-300 ${
                  selected
                    ? 'border-[#17130F] bg-[#17130F] text-[#F8F1E2] shadow-[0_12px_30px_rgba(17,17,17,0.14)]'
                    : 'border-[#E3D8CA] bg-[#FFFDF8] text-[#17130F]'
                }`}
              >
                <p className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${selected ? 'text-[#D7BC7F]' : 'text-[#8A7351]'}`}>{day.label}</p>
                <p className="mt-1 text-[22px] font-semibold leading-none">{day.dateLabel}</p>
                <p className={`mt-2 text-[9px] font-semibold uppercase tracking-[0.08em] ${selected ? 'text-[#D8CDB8]' : 'text-[#8B847B]'}`}>
                  {STATE_LABELS[day.state]}
                </p>
              </button>
            )
          })}
        </div>
      </section>

      <section className="px-5 pt-5">
        <div className="mb-3 rounded-[22px] border border-[#E3D8C7] bg-[#FFFDF8] px-4 py-4 shadow-[0_10px_26px_rgba(27,22,16,0.05)]">
	          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8A7351]">Calendar Summary</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-[16px] bg-[#F6F0E7] px-3 py-3">
              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#9A825F]">Happening</p>
	              <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-[#17130F]">{selectedEvent?.title ?? 'Calendar is waiting for a source.'}</p>
            </div>
            <div className="rounded-[16px] bg-[#F6F0E7] px-3 py-3">
              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#9A825F]">Next</p>
              <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-[#17130F]">{nextEvent?.title ?? 'No next event staged.'}</p>
            </div>
            <div className="rounded-[16px] bg-[#F6F0E7] px-3 py-3">
              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#9A825F]">Blocked</p>
              <p className="mt-1 text-[12px] leading-snug text-[#17130F]">{unresolvedCount > 0 ? `${unresolvedCount} unresolved dependency${unresolvedCount === 1 ? '' : 'ies'}.` : 'No visible block.'}</p>
            </div>
            <div className="rounded-[16px] bg-[#F6F0E7] px-3 py-3">
              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#9A825F]">Affected</p>
              <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-[#17130F]">{selectedEvent?.people.concat(selectedEvent.departments).slice(0, 3).join(', ') || 'Owners open.'}</p>
            </div>
          </div>
        </div>
        <div className="rounded-[28px] border border-[#E4D8C9] bg-[linear-gradient(180deg,#FFFDF8_0%,#F4EDE3_100%)] px-4 py-4 shadow-[0_14px_34px_rgba(27,22,16,0.06)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9A7C46]">Primary briefing</p>
              <h2 className="mt-1 text-[20px] font-semibold leading-tight text-[#17130F]">
                {selectedEvent?.title ?? 'No imported calendar event yet'}
              </h2>
            </div>
            {selectedEvent && (
              <span className="rounded-full bg-[#F1E6D4] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7D6132]">
                {formatOperationalTime(selectedEvent.startTime ?? selectedEvent.timestamp)}
              </span>
            )}
          </div>

	          <p className="mt-3 text-[14px] leading-relaxed text-[#5F5348]">
	            {selectedEvent?.summary ?? (events.length > 0 ? 'Imported calendar events are available in the list below.' : 'The calendar is waiting for imported events.')}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-[18px] bg-[#F6F0E7] px-3 py-3">
              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#9A825F]">Next move</p>
              <p className="mt-1 text-[12px] leading-snug text-[#17130F]">{nextMove}</p>
            </div>
            <div className="rounded-[18px] bg-[#F6F0E7] px-3 py-3">
              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#9A825F]">Timing</p>
              <p className="mt-1 text-[12px] leading-snug text-[#17130F]">
                {selectedEvent ? selectedDay?.fullLabel : 'Timing open'}
              </p>
            </div>
            <div className="rounded-[18px] bg-[#F6F0E7] px-3 py-3">
              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#9A825F]">Source</p>
              <p className="mt-1 text-[12px] leading-snug text-[#17130F]">
	                {selectedEvent?.sourceArtifactTitle ?? 'Awaiting source file'}
              </p>
            </div>
            <div className="rounded-[18px] bg-[#F6F0E7] px-3 py-3">
              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#9A825F]">Imported</p>
              <p className="mt-1 text-[12px] leading-snug text-[#17130F]">
                {formatOperationalDateTime(selectedEvent?.importedAt) || 'Import pending'}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-[#EFE8DA] px-2.5 py-1 text-[11px] font-medium text-[#6B5D4B]">{trustSignal}</span>
            <span className="rounded-full bg-[#EFE8DA] px-2.5 py-1 text-[11px] font-medium text-[#6B5D4B]">{freshnessSignal}</span>
          </div>

          <button
            type="button"
            onClick={() => setShowTelaWhy(true)}
            className="mt-4 min-h-[46px] w-full rounded-[18px] border border-[#D8C59D] bg-[#17130F] px-4 text-left text-[#F8F1E2] shadow-[0_18px_38px_rgba(20,16,12,0.14)]"
          >
	            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#D7BC7F]">Why this matters</p>
	            <p className="mt-1 text-[13px] leading-relaxed text-[#E0D2BB]">See the people, timing, source, and reason behind this event.</p>
          </button>
        </div>
      </section>

      <section className="px-5 pt-5">
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5E5348]">In view</h2>
        <div className="flex flex-col gap-3">
          {displayedEvents.map((event) => (
            <CalendarEventCard key={event.id} event={event} />
          ))}
          {displayedEvents.length === 0 && (
            <div className="rounded-[22px] border border-dashed border-[#D6C9B7] px-4 py-8 text-center">
              <p className="text-[13px] font-semibold text-[#6B5D4B]">No imported calendar events yet.</p>
	        <p className="mt-1 text-[12px] leading-relaxed text-[#8B847B]">Upload a tour calendar to populate this screen from the same saved ShowTELA state as Home.</p>
            </div>
          )}
        </div>
      </section>

	      <BottomSheet open={showTelaWhy} onClose={() => setShowTelaWhy(false)} title="Why this matters">
        <div className="space-y-4">
          <div className="rounded-[18px] bg-[#FFFDF8] px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9A7C46]">Who</p>
            <p className="mt-1 text-[13px] leading-relaxed text-[#5B4D3D]">
              {selectedEvent?.people.join(', ') || 'Owners still being confirmed.'}
            </p>
          </div>
          <div className="rounded-[18px] bg-[#FFFDF8] px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9A7C46]">What</p>
            <p className="mt-1 text-[13px] leading-relaxed text-[#5B4D3D]">
              {selectedEvent?.summary || 'No operational issue is attached yet.'}
            </p>
          </div>
          <div className="rounded-[18px] bg-[#FFFDF8] px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9A7C46]">When</p>
            <p className="mt-1 text-[13px] leading-relaxed text-[#5B4D3D]">
              {selectedEvent ? `${selectedDay?.fullLabel} at ${formatOperationalTime(selectedEvent.startTime ?? selectedEvent.timestamp)}.` : 'Timing is still open.'}
              {' '}
              {freshnessSignal}.
            </p>
          </div>
          <div className="rounded-[18px] bg-[#FFFDF8] px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9A7C46]">How</p>
            <p className="mt-1 text-[13px] leading-relaxed text-[#5B4D3D]">
              {selectedEvent?.departments.join(', ') || 'Dependencies are not fully mapped yet.'}
            </p>
          </div>
          <div className="rounded-[18px] bg-[#FFFDF8] px-4 py-3">
	            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9A7C46]">Source</p>
            <p className="mt-1 text-[13px] leading-relaxed text-[#5B4D3D]">
	              {selectedEvent?.lineage?.originatingArtifactTitle ?? 'No source file linked yet.'}
	              {selectedEvent?.lineage?.continuityEventId ? ` / saved update ${selectedEvent.lineage.continuityEventId}` : ''}
            </p>
          </div>
          <div className="rounded-[18px] bg-[#FFFDF8] px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9A7C46]">Why</p>
            <p className="mt-1 text-[13px] leading-relaxed text-[#5B4D3D]">{whyLabel(selectedEvent)}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="min-h-[44px] rounded-[16px] bg-[#17130F] px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#F7E8C2]">
              Ask TELA
            </button>
            <button type="button" className="min-h-[44px] rounded-[16px] border border-[#DDD0BB] bg-[#F7F1E8] px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8A6725]">
              Prepare update
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  )
}
