'use client'

import { useMemo, useState } from 'react'
import { EventFeed } from '@/components/constitutional/EventFeed'
import type { OperationalCalendarEvent } from '@/lib/showtela/calendar'
import { formatOperationalTime, getWeekDays, getUnresolvedCount } from '@/lib/showtela/calendar'
import { buildContinuityMemory, deriveOperationalLineage, derivePressureEvolution, deriveStateTransitions } from '@/lib/showtela/lineage'
import { buildPredictionSummary } from '@/lib/showtela/prediction'
import { buildReasoningSummary } from '@/lib/showtela/reasoning'
import { CalendarEventCard } from './CalendarEventCard'
import { ContinuityMemoryPanel } from './ContinuityMemoryPanel'
import { ContinuityDriftCard } from './ContinuityDriftCard'
import { ContinuityWatchPanel } from './ContinuityWatchPanel'
import { DepartmentLoadCard } from './DepartmentLoadCard'
import { DependencyChainCard } from './DependencyChainCard'
import { OperationalLineageCard } from './OperationalLineageCard'
import { OperationalPressureCard } from './OperationalPressureCard'
import { OperationalPredictionCard } from './OperationalPredictionCard'
import { OperationalRiskTimeline } from './OperationalRiskTimeline'
import { OperationalTimelineEvent } from './OperationalTimelineEvent'
import { PressureEvolutionCard } from './PressureEvolutionCard'
import { StateTransitionCard } from './StateTransitionCard'
import { TelaCalendarActionPanel } from './TelaCalendarActionPanel'
import { TelaReasoningPanel } from './TelaReasoningPanel'
import { BottomSheet } from './sheets/BottomSheet'

const STATE_LABELS: Record<string, string> = {
  calm: 'Calm',
  active: 'Active',
  pressure: 'Pressure',
  critical: 'Critical',
  waiting: 'Waiting',
  needs_decision: 'Needs Decision',
  tela_ready: 'TELA Ready',
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
  if (!event) return 'No active movement is derived for this day yet.'
  if (event.summary) return event.summary
  if (event.telaHint) return event.telaHint
  if (event.unresolvedCount > 0) return `${event.title} still needs confirmation before the day can settle.`
  return `${event.title} is the clearest operational movement on this day.`
}

function buildNextAction(event?: OperationalCalendarEvent) {
  if (!event) return 'Review'
  if (event.unresolvedCount > 0 || ['critical', 'needs_decision', 'pressure'].includes(event.pressureState)) return 'Resolve'
  if (event.people.length === 0 || event.continuityState === 'stale') return 'Confirm'
  return 'Review'
}

function buildConfidenceSignal({
  continuityState,
  predictionRisk,
  unresolvedCount,
}: {
  continuityState?: string
  predictionRisk?: string
  unresolvedCount: number
}) {
  if (continuityState === 'fresh' && (predictionRisk === 'stable' || predictionRisk === 'watch') && unresolvedCount === 0) {
    return 'Confidence high'
  }
  if (continuityState === 'stale' || predictionRisk === 'critical' || predictionRisk === 'high') {
    return 'Confidence guarded'
  }
  if (continuityState === 'aging' || unresolvedCount > 0) {
    return 'Confidence watch'
  }
  return 'Confidence stable'
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
  const [showTelaWhy, setShowTelaWhy] = useState(false)

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
  const memory = useMemo(() => buildContinuityMemory(events, prediction.dependencies), [events, prediction.dependencies])
  const lineage = useMemo(() => deriveOperationalLineage(reasoningScope, reasoning.dependencies), [reasoningScope, reasoning.dependencies])
  const transitions = useMemo(() => deriveStateTransitions(reasoningScope), [reasoningScope])
  const pressureEvolution = useMemo(
    () => derivePressureEvolution(events, selectedDay?.key ?? selectedDayKey, prediction.dependencies),
    [events, prediction.dependencies, selectedDay?.key, selectedDayKey],
  )
  const unresolvedCount = getUnresolvedCount(events)
  const pressureEvents = events.filter((event) => ['pressure', 'critical', 'needs_decision', 'tela_ready'].includes(event.pressureState))
  const recentChanges = events
    .filter((event) => event.continuityState === 'fresh' || event.sourceEntityId)
    .slice(0, 4)
  const briefingEvent = selectedDay?.nextEvent ?? selectedEvent
  const focusEvent = reasoning.highestPressureEvent ?? briefingEvent
  const dayState = focusEvent?.pressureState ?? selectedDay?.state ?? 'calm'
  const dayTone = STATE_TONES[dayState] ?? STATE_TONES.calm
  const operationalSentence = buildOperationalSentence(focusEvent)
  const nextActionLabel = buildNextAction(focusEvent)
  const confidenceSignal = buildConfidenceSignal({
    continuityState: selectedDay?.continuityState,
    predictionRisk: prediction.predictions[0]?.riskLevel,
    unresolvedCount: selectedDay?.unresolvedCount ?? 0,
  })
  const nextActionText =
    prediction.predictions[0]?.recommendedFocus ??
    reasoning.recommendedFocus ??
    (focusEvent ? `Clarify ${focusEvent.title}.` : 'Select a day with derived movement.')

  return (
    <div className="min-h-screen bg-[#F8F6F2] pb-8">
      <header className="border-b border-[#EAE0D3] bg-[#F8F6F2] px-5 pb-4 pt-14">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9A7C46]">Operational Time</p>
        <h1 className="mt-1 text-[24px] font-semibold leading-tight text-[#141210]">Calendar readiness</h1>
        <p className="mt-1 text-[13px] leading-relaxed text-[#6B5D4B]">Certainty first. Reasoning is available when requested.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-[#17130F] px-3 py-1.5 text-[11px] font-semibold text-[#F8F1E2]">{events.length} events</span>
          <span className="rounded-full bg-[#FFFDF8] px-3 py-1.5 text-[11px] font-semibold text-[#17130F] shadow-[0_8px_20px_rgba(27,22,16,0.05)]">{unresolvedCount} open</span>
          <span className="rounded-full bg-[#FFFDF8] px-3 py-1.5 text-[11px] font-semibold text-[#17130F] shadow-[0_8px_20px_rgba(27,22,16,0.05)]">{pressureEvents.length} under pressure</span>
        </div>
      </header>

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
        <div
          className="rounded-[28px] border px-4 py-4 shadow-[0_12px_30px_rgba(27,22,16,0.06)]"
          style={{ backgroundColor: dayTone.panelBg, borderColor: dayTone.panelBorder }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9A7C46]">Default Briefing</p>
              <h2 className="mt-1 text-[22px] font-semibold leading-tight text-[#17130F]">{selectedDay?.fullLabel}</h2>
            </div>
            <span
              className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]"
              style={{ backgroundColor: dayTone.badgeBg, color: dayTone.badgeText }}
            >
              {STATE_LABELS[dayState]}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span
              className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
              style={{ backgroundColor: dayTone.badgeBg, color: dayTone.badgeText }}
            >
              {selectedDay?.unresolvedCount ?? 0} open
            </span>
            <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold capitalize text-[#5E5348]">
              {selectedDay?.continuityState ?? 'unknown'} continuity
            </span>
            <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-[#5E5348]">
              {selectedDay?.density ?? 'light'} load
            </span>
          </div>

          <p className="mt-4 text-[18px] font-semibold leading-snug text-[#17130F]">{focusEvent?.title ?? 'No primary movement selected'}</p>
          <p className="mt-2 text-[14px] leading-relaxed text-[#5E5348]">{operationalSentence}</p>

          <div className="mt-4 rounded-[18px] bg-white/80 px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9A7C46]">Next Action</p>
            <p className="mt-1 text-[13px] leading-relaxed text-[#3E352C]">{nextActionText}</p>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 rounded-[18px] border border-white/80 bg-white/70 px-3 py-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9A7C46]">Confidence</p>
              <p className="mt-1 text-[13px] font-semibold text-[#17130F]">{confidenceSignal}</p>
            </div>
            <div className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: dayTone.accent }} />
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              className="min-h-[48px] flex-1 rounded-[18px] bg-[#17130F] px-4 text-[13px] font-semibold text-[#F8F1E2]"
            >
              {nextActionLabel}
            </button>
            <button
              type="button"
              onClick={() => setShowTelaWhy(true)}
              className="min-h-[48px] rounded-[18px] border border-[#D8C7A6] bg-[#FFFDF8] px-4 text-[13px] font-semibold text-[#8A6725]"
            >
              TELAwhy
            </button>
          </div>
        </div>
      </section>

      <section className="px-5 pt-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5E5348]">Day Lane</h2>
          <p className="text-[11px] font-medium text-[#8B847B]">{selectedEvents.length} visible</p>
        </div>
        <div className="flex flex-col gap-3">
          {selectedEvents.map((event) => (
            <article key={event.id} className="rounded-[22px] border border-[#E8DDCC] bg-[#FFFDF8] px-4 py-4 shadow-[0_10px_28px_rgba(27,22,16,0.05)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: (STATE_TONES[event.pressureState] ?? STATE_TONES.calm).accent }} />
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8A7351]">
                      {event.type} / {STATE_LABELS[event.pressureState]}
                    </p>
                  </div>
                  <h3 className="mt-2 text-[15px] font-semibold leading-tight text-[#17130F]">{event.title}</h3>
                  <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-[#62564B]">
                    {event.summary ?? event.telaHint ?? 'Operational movement is present for this slot.'}
                  </p>
                </div>
                <p className="flex-shrink-0 text-[11px] font-semibold text-[#8A6725]">{formatOperationalTime(event.startTime ?? event.timestamp)}</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-[#F6F0E7] px-2.5 py-1 text-[11px] font-semibold capitalize text-[#5E5348]">{event.continuityState}</span>
                <span className="rounded-full bg-[#F6F0E7] px-2.5 py-1 text-[11px] font-semibold text-[#5E5348]">{event.density} density</span>
                <span className="rounded-full bg-[#F6F0E7] px-2.5 py-1 text-[11px] font-semibold text-[#5E5348]">
                  {event.people.length > 0 ? event.people.slice(0, 2).join(' / ') : 'Owner open'}
                </span>
                {event.unresolvedCount > 0 && (
                  <span className="rounded-full bg-[#17130F] px-2.5 py-1 text-[11px] font-semibold text-[#F4D7A1]">{event.unresolvedCount} unresolved</span>
                )}
              </div>
            </article>
          ))}
          {selectedEvents.length === 0 && (
            <div className="rounded-[22px] border border-dashed border-[#D6C9B7] px-4 py-8 text-center">
              <p className="text-[13px] font-semibold text-[#6B5D4B]">No derived operational events for this day.</p>
              <p className="mt-1 text-[12px] leading-relaxed text-[#8B847B]">The calendar is waiting for continuity, unresolved pressure, or entity movement.</p>
            </div>
          )}
        </div>
      </section>

      <BottomSheet open={showTelaWhy} onClose={() => setShowTelaWhy(false)} title={`${selectedDay?.fullLabel ?? 'Calendar'} TELAwhy`}>
        <div className="space-y-4">
          <div className="rounded-[20px] border border-[#E5D8C7] bg-[#FFFDF8] px-4 py-4 shadow-[0_10px_26px_rgba(27,22,16,0.05)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9A7C46]">Requested Cognition</p>
            <p className="mt-2 text-[14px] leading-relaxed text-[#3E352C]">
              Reasoning, prediction, continuity drift, lineage, and escalation logic are available here after explicit request.
            </p>
          </div>

          <TelaCalendarActionPanel selectedEvent={selectedEvent} />
          <TelaReasoningPanel summary={reasoning} />
          <OperationalPressureCard reason={reasoning.pressureReasons[0]} />
          <ContinuityDriftCard drift={reasoning.drift} />
          <DependencyChainCard dependency={reasoning.keyDependency} events={reasoningScope} />
          <ContinuityWatchPanel watch={prediction.watch} />
          <OperationalPredictionCard prediction={prediction.predictions[0]} events={events} />
          <OperationalRiskTimeline events={events} predictions={prediction.predictions} />
          <ContinuityMemoryPanel memory={memory} />
          <EventFeed events={[]} />
          <PressureEvolutionCard evolution={pressureEvolution} />
          <OperationalLineageCard event={lineage[0]} />
          <StateTransitionCard transition={transitions[0]} />

          <section>
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5E5348]">Operational Memory Timeline</h2>
            <div className="flex flex-col gap-2">
              {lineage.slice(0, 4).map((event) => (
                <OperationalTimelineEvent key={event.id} event={event} />
              ))}
              {lineage.length === 0 && (
                <p className="rounded-[18px] bg-[#FFFDF8] px-3 py-3 text-[12px] text-[#8B847B]">No derived operational memory movement yet.</p>
              )}
            </div>
          </section>

          {prediction.departmentLoad.slice(0, 3).map((load) => (
            <DepartmentLoadCard key={load.department} load={load} />
          ))}

          <section>
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

          <section>
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

          <section className="rounded-[22px] border border-[#E4D8C9] bg-[#FFFDF8] px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9A7C46]">Recent Continuity Changes</p>
            <div className="mt-3 flex flex-col gap-2">
              {recentChanges.map((event) => (
                <div key={event.id} className="border-t border-[#EEE5D8] pt-2 first:border-t-0 first:pt-0">
                  <p className="line-clamp-1 text-[12px] font-semibold text-[#17130F]">{event.title}</p>
                  <p className="mt-0.5 text-[10px] text-[#8B847B]">{event.lineagePlaceholder ?? 'Lineage placeholder prepared.'}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[22px] border border-[#D8C7A6] bg-[#F4ECDD] px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8A6725]">Provenance Placeholder</p>
            <p className="mt-1 text-[12px] leading-relaxed text-[#5B4D3D]">
              Calendar lineage is prepared for Notion, Google Calendar, manual entries, TELA-created actions, and system-generated events. This pass does not write persistence.
            </p>
          </section>
        </div>
      </BottomSheet>
    </div>
  )
}
