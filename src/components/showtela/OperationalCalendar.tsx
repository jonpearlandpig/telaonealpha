'use client'

import type { ContinuityEvent } from '@/lib/showtela/types'

type OperationalState = 'stabilized' | 'elevated' | 'unresolved' | 'cascading' | 'converging' | 'blocked'

const STATE_ACCENT: Record<OperationalState, string> = {
  stabilized: '#B8A88A',
  elevated:   '#C89B2F',
  unresolved: '#C07A3A',
  cascading:  '#B85A3A',
  blocked:    '#A84030',
  converging: '#7A9A9A',
}

const STATE_LABEL_COLOR: Record<OperationalState, string> = {
  stabilized: '#8B847B',
  elevated:   '#9A7C46',
  unresolved: '#965C30',
  cascading:  '#8C4030',
  blocked:    '#8C3028',
  converging: '#5A7A7A',
}

function deriveState(event: ContinuityEvent): OperationalState {
  const pressure = event.pressure ?? 'low'
  const unresolved = event.unresolvedDependencies?.length ?? 0
  if (pressure === 'high' && unresolved > 1) return 'cascading'
  if (pressure === 'high') return 'blocked'
  if (pressure === 'medium' && unresolved > 0) return 'unresolved'
  if (pressure === 'medium') return 'elevated'
  if (event.isNew) return 'converging'
  return 'stabilized'
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    const h = d.getHours() % 12 || 12
    const m = d.getMinutes().toString().padStart(2, '0')
    const ampm = d.getHours() >= 12 ? 'P' : 'A'
    return `${h}:${m}${ampm}`
  } catch {
    return ''
  }
}

function makeDayKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function formatDayLabel(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const todayKey = makeDayKey(today.toISOString())
  const eventKey = makeDayKey(iso)
  const diffMs = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
    - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diffDays = Math.round(diffMs / 86400000)
  if (eventKey === todayKey || diffDays === 0) return 'TODAY'
  if (diffDays === 1) return 'YESTERDAY'
  if (diffDays === -1) return 'TOMORROW'
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()
}

function groupByDay(events: ContinuityEvent[]): Array<{ dayKey: string; dayLabel: string; events: ContinuityEvent[] }> {
  const withTs = events.filter((e) => e.timestamp)
  const sorted = [...withTs].sort((a, b) => new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime())
  const map = new Map<string, ContinuityEvent[]>()
  for (const event of sorted) {
    const key = makeDayKey(event.timestamp!)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(event)
  }
  return Array.from(map.entries()).map(([dayKey, dayEvents]) => ({
    dayKey,
    dayLabel: formatDayLabel(dayEvents[0].timestamp!),
    events: dayEvents,
  }))
}

function EventCard({ event, onTap }: { event: ContinuityEvent; onTap: () => void }) {
  const state = deriveState(event)
  const accent = STATE_ACCENT[state]
  const labelColor = STATE_LABEL_COLOR[state]
  const time = event.timestamp ? formatTime(event.timestamp) : ''
  const entities = (event.linkedEntities?.length ? event.linkedEntities : event.tags ?? []).slice(0, 3)

  return (
    <button
      className="w-full overflow-hidden rounded-[18px] bg-white text-left"
      style={{ boxShadow: '0 4px 16px rgba(17,17,17,0.06)' }}
      onClick={onTap}
    >
      <div className="flex">
        <div className="w-[3px] flex-shrink-0" style={{ backgroundColor: accent }} />
        <div className="min-w-0 flex-1 px-4 py-3.5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[14px] font-semibold leading-snug text-[#141210]">{event.headline}</p>
            {time && <span className="flex-shrink-0 pt-0.5 text-[10px] text-[#A89880]">{time}</span>}
          </div>
          {event.body && (
            <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-[#6B5D4B]">{event.body}</p>
          )}
          <div className="mt-2.5 flex items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {entities.map((entity) => (
                <span
                  key={entity}
                  className="rounded-full px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.10em]"
                  style={{ background: '#F5EFE3', color: '#6B5D4B' }}
                >
                  {entity}
                </span>
              ))}
            </div>
            <span
              className="flex-shrink-0 text-[10px] font-medium uppercase tracking-[0.14em]"
              style={{ color: labelColor }}
            >
              {state}
            </span>
          </div>
        </div>
      </div>
    </button>
  )
}

export function OperationalCalendar({
  feed,
  onEventTap,
}: {
  feed: ContinuityEvent[]
  onEventTap: (item: ContinuityEvent) => void
}) {
  const days = groupByDay(feed)

  return (
    <div style={{ backgroundColor: '#F8F6F2', minHeight: '100vh' }}>
      <div className="border-b border-[#EAE4DA] px-5 pb-4 pt-14">
        <h1 className="text-xl font-semibold text-[#141210]">Operational Calendar</h1>
        <p className="mt-0.5 text-[12px] text-[#8B847B]">Forward continuity view</p>
      </div>

      <div className="px-5 pb-32 pt-5">
        {days.length === 0 && (
          <div className="pt-16 text-center">
            <p className="text-[13px] text-[#8B847B]">No dispatches on record.</p>
            <p className="mt-1 text-[11px] text-[#A89880]">Dispatches will arrive as operations move.</p>
          </div>
        )}

        {days.map((day) => (
          <div key={day.dayKey} className="mb-7">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'rgba(200,155,47,0.70)' }}>
              {day.dayLabel}
            </p>
            <div className="flex flex-col gap-2.5">
              {day.events.map((event) => (
                <EventCard key={event.id} event={event} onTap={() => onEventTap(event)} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
