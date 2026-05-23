'use client'

import { useMemo, useState } from 'react'
import type { OperationalCalendarEvent } from '@/lib/showtela/calendar'
import { getWeekDays, getUnresolvedCount } from '@/lib/showtela/calendar'
import { buildPredictionSummary } from '@/lib/showtela/prediction'
import { buildReasoningSummary } from '@/lib/showtela/reasoning'
import { CalendarEventCard } from './CalendarEventCard'
import { ContinuityDriftCard } from './ContinuityDriftCard'
import { ContinuityWatchPanel } from './ContinuityWatchPanel'
import { DepartmentLoadCard } from './DepartmentLoadCard'
import { DependencyChainCard } from './DependencyChainCard'
import { OperationalPressureCard } from './OperationalPressureCard'
import { OperationalPredictionCard } from './OperationalPredictionCard'
import { OperationalRiskTimeline } from './OperationalRiskTimeline'
import { TelaCalendarActionPanel } from './TelaCalendarActionPanel'
import { TelaReasoningPanel } from './TelaReasoningPanel'

const STATE_LABELS: Record<string, string> = {
  calm: 'Calm',
  active: 'Active',
  pressure: 'Pressure',
  critical: 'Critical',
  waiting: 'Waiting',
  needs_decision: 'Needs Decision',
  tela_ready: 'TELA Ready',
}

export function OperationalCalendar({
  events,
  baseDate,
  onOpenVoice,
}: {
  events: OperationalCalendarEvent[]
  baseDate?: Date
  onOpenVoice?: () => void
}) {
  const days = useMemo(() => getWeekDays(baseDate, events), [baseDate, events])
  const [selectedDayKey, setSelectedDayKey] = useState(() => days[0]?.key ?? '')

  const selectedDay = days.find((day) => day.key === selectedDayKey) ?? days[0]
  const selectedEvents = selectedDay?.events ?? []
  const selectedEvent = selectedEvents[0]
  const reasoningScope = selectedEvents.length > 0 ? selectedEvents : events
  const reasoning = useMemo(
    () => buildReasoningSummary(reasoningScope, selectedDay?.key ?? selectedDayKey),
    [reasoningScope, selectedDay?.key, selectedDayKey],
  )
  const prediction = useMemo(
    () => buildPredictionSummary(events, selectedDay?.key ?? selectedDayKey),
    [events, selectedDay?.key, selectedDayKey],
  )
  const unresolvedCount = getUnresolvedCount(events)
  const pressureEvents = events.filter((event) => ['pressure', 'critical', 'needs_decision', 'tela_ready'].includes(event.pressureState))
  const recentChanges = events
    .filter((event) => event.continuityState === 'fresh' || event.sourceEntityId)
    .slice(0, 4)

  return (
    <div className="min-h-screen bg-[#F8F6F2] pb-8">
      <header className="border-b border-[#EAE0D3] bg-[#F8F6F2] px-5 pb-4 pt-14">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9A7C46]">Operational Time</p>
        <h1 className="mt-1 text-[24px] font-semibold leading-tight text-[#141210]">Calendar command surface</h1>
        <p className="mt-1 text-[13px] leading-relaxed text-[#6B5D4B]">Temporal continuity across people, pressure, entities, and unresolved movement.</p>
      </header>

      <section className="px-5 pt-5">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-[18px] bg-[#17130F] px-3 py-3 text-[#F8F1E2]">
            <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[#D7BC7F]">Events</p>
            <p className="mt-1 text-[22px] font-semibold leading-none">{events.length}</p>
          </div>
          <div className="rounded-[18px] bg-[#FFFDF8] px-3 py-3 shadow-[0_8px_20px_rgba(27,22,16,0.05)]">
            <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[#9A7C46]">Open</p>
            <p className="mt-1 text-[22px] font-semibold leading-none text-[#17130F]">{unresolvedCount}</p>
          </div>
          <div className="rounded-[18px] bg-[#FFFDF8] px-3 py-3 shadow-[0_8px_20px_rgba(27,22,16,0.05)]">
            <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[#9A7C46]">Pressure</p>
            <p className="mt-1 text-[22px] font-semibold leading-none text-[#17130F]">{pressureEvents.length}</p>
          </div>
        </div>
      </section>

      <section className="pt-5">
        <div className="mb-3 flex items-center justify-between px-5">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5E5348]">Week Selector</h2>
          <button
            type="button"
            onClick={onOpenVoice}
            className="min-h-[36px] rounded-full border border-[#D8C7A6] bg-[#FFFDF8] px-3 text-[11px] font-semibold text-[#8A6725]"
          >
            Voice Ready
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto px-5 pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {days.map((day) => {
            const selected = day.key === selectedDay?.key
            return (
              <button
                key={day.key}
                type="button"
                onClick={() => setSelectedDayKey(day.key)}
                className={`min-h-[74px] w-[66px] flex-shrink-0 rounded-[18px] border px-2 py-2 text-left ${selected ? 'border-[#17130F] bg-[#17130F] text-[#F8F1E2]' : 'border-[#E3D8CA] bg-[#FFFDF8] text-[#17130F]'}`}
              >
                <p className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${selected ? 'text-[#D7BC7F]' : 'text-[#8A7351]'}`}>{day.label}</p>
                <p className="mt-1 text-[21px] font-semibold leading-none">{day.dateLabel}</p>
                <p className={`mt-1 text-[9px] font-semibold uppercase tracking-[0.08em] ${selected ? 'text-[#D8CDB8]' : 'text-[#8B847B]'}`}>{STATE_LABELS[day.state]}</p>
              </button>
            )
          })}
        </div>
      </section>

      <section className="px-5 pt-5">
        <div className="rounded-[24px] border border-[#E4D8C9] bg-[#FFFDF8] px-4 py-4 shadow-[0_10px_26px_rgba(27,22,16,0.05)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9A7C46]">Selected Day</p>
              <h2 className="mt-1 text-[20px] font-semibold leading-tight text-[#17130F]">{selectedDay?.fullLabel}</h2>
            </div>
            <span className="rounded-full bg-[#F1E6D4] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7D6132]">
              {selectedDay?.density}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-[14px] bg-[#F6F0E7] px-3 py-2">
              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#9A825F]">Ops</p>
              <p className="mt-1 text-[17px] font-semibold text-[#17130F]">{selectedEvents.length}</p>
            </div>
            <div className="rounded-[14px] bg-[#F6F0E7] px-3 py-2">
              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#9A825F]">Open</p>
              <p className="mt-1 text-[17px] font-semibold text-[#17130F]">{selectedDay?.unresolvedCount ?? 0}</p>
            </div>
            <div className="rounded-[14px] bg-[#F6F0E7] px-3 py-2">
              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#9A825F]">Drift</p>
              <p className="mt-1 text-[13px] font-semibold capitalize text-[#17130F]">{selectedDay?.continuityState ?? 'unknown'}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 pt-4">
        <TelaCalendarActionPanel selectedEvent={selectedEvent} />
      </section>

      <section className="px-5 pt-4">
        <TelaReasoningPanel summary={reasoning} />
      </section>

      <section className="px-5 pt-4">
        <OperationalPressureCard reason={reasoning.pressureReasons[0]} />
      </section>

      <section className="px-5 pt-4">
        <ContinuityDriftCard drift={reasoning.drift} />
      </section>

      <section className="px-5 pt-4">
        <DependencyChainCard dependency={reasoning.keyDependency} events={reasoningScope} />
      </section>

      <section className="px-5 pt-4">
        <ContinuityWatchPanel watch={prediction.watch} />
      </section>

      <section className="px-5 pt-4">
        <OperationalPredictionCard prediction={prediction.predictions[0]} events={events} />
      </section>

      <section className="px-5 pt-4">
        <OperationalRiskTimeline events={events} predictions={prediction.predictions} />
      </section>

      {prediction.departmentLoad.slice(0, 3).map((load) => (
        <section key={load.department} className="px-5 pt-4">
          <DepartmentLoadCard load={load} />
        </section>
      ))}

      <section className="px-5 pt-5">
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5E5348]">Operational Event Stream</h2>
        <div className="flex flex-col gap-3">
          {selectedEvents.map((event) => (
            <CalendarEventCard key={event.id} event={event} />
          ))}
          {selectedEvents.length === 0 && (
            <div className="rounded-[22px] border border-dashed border-[#D6C9B7] px-4 py-8 text-center">
              <p className="text-[13px] font-semibold text-[#6B5D4B]">No derived operational events for this day.</p>
              <p className="mt-1 text-[12px] leading-relaxed text-[#8B847B]">The calendar is waiting for continuity, unresolved pressure, or entity movement.</p>
            </div>
          )}
        </div>
      </section>

      <section className="px-5 pt-5">
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5E5348]">Upcoming Dependencies</h2>
        <div className="flex flex-col gap-2">
          {pressureEvents.slice(0, 4).map((event) => (
            <div key={event.id} className="rounded-[18px] bg-[#FFFDF8] px-3 py-3 shadow-[0_8px_20px_rgba(27,22,16,0.05)]">
              <p className="text-[12px] font-semibold text-[#17130F]">{event.title}</p>
              <p className="mt-1 text-[11px] leading-snug text-[#6B5D4B]">{event.telaHint}</p>
            </div>
          ))}
          {pressureEvents.length === 0 && (
            <p className="rounded-[18px] bg-[#FFFDF8] px-3 py-3 text-[12px] text-[#8B847B]">No pressure dependencies derived from current runtime state.</p>
          )}
        </div>
      </section>

      <section className="px-5 pt-5">
        <div className="rounded-[22px] border border-[#E4D8C9] bg-[#FFFDF8] px-4 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9A7C46]">Recent Continuity Changes</p>
          <div className="mt-3 flex flex-col gap-2">
            {recentChanges.map((event) => (
              <div key={event.id} className="border-t border-[#EEE5D8] pt-2 first:border-t-0 first:pt-0">
                <p className="line-clamp-1 text-[12px] font-semibold text-[#17130F]">{event.title}</p>
                <p className="mt-0.5 text-[10px] text-[#8B847B]">{event.lineagePlaceholder ?? 'Lineage placeholder prepared.'}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pt-5">
        <div className="rounded-[22px] border border-[#D8C7A6] bg-[#F4ECDD] px-4 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8A6725]">Provenance Placeholder</p>
          <p className="mt-1 text-[12px] leading-relaxed text-[#5B4D3D]">
            Calendar lineage is prepared for Notion, Google Calendar, manual entries, TELA-created actions, and system-generated events. This pass does not write persistence.
          </p>
        </div>
      </section>
    </div>
  )
}
