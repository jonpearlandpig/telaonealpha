import type { OperationalCalendarEvent } from '@/lib/showtela/calendar'
import { getWeekDays } from '@/lib/showtela/calendar'

const STATE_STYLES = {
  calm: { label: 'Calm', bg: '#F7F2E9', border: '#E6DCCD', text: '#756A5B', accent: '#8EA58E' },
  active: { label: 'Active', bg: '#FBF4E7', border: '#EAD9B8', text: '#75551F', accent: '#C89B2F' },
  pressure: { label: 'Attention Needed', bg: '#FBEEE1', border: '#E7C9A7', text: '#7E4F1F', accent: '#D68A3A' },
  critical: { label: 'Attention Needed', bg: '#F7E6E1', border: '#E2BEB3', text: '#7C332A', accent: '#C85B4A' },
  waiting: { label: 'Watching', bg: '#F1ECE4', border: '#DDD4C7', text: '#665E55', accent: '#8B847B' },
  needs_decision: { label: 'Attention Needed', bg: '#F8ECE0', border: '#E6C9A7', text: '#794819', accent: '#B7772D' },
  tela_ready: { label: 'Active', bg: '#E7F2EE', border: '#C7E0D8', text: '#194E45', accent: '#1F6B5F' },
}

export function CalendarWeekRail({
  events,
  baseDate,
  onOpenCalendar,
}: {
  events: OperationalCalendarEvent[]
  baseDate?: Date
  onOpenCalendar?: () => void
}) {
  const days = getWeekDays(baseDate, events)

  return (
    <section className="pb-2">
      <div className="mb-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8A7351]">CRUSADE CALENDAR</p>
      </div>

      <div className="flex snap-x gap-3 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {days.map((day) => {
          const style = STATE_STYLES[day.state]
          const next = day.nextEvent
          const hasUnresolved = day.unresolvedCount > 0

          return (
            <button
              key={day.key}
              type="button"
              onClick={onOpenCalendar}
              className="min-h-[156px] w-[132px] flex-shrink-0 snap-start rounded-[24px] border px-3 py-3 text-left shadow-[0_12px_28px_rgba(27,22,16,0.05)] transition-[box-shadow,transform,border-color] duration-300 hover:-translate-y-0.5"
              style={{ backgroundColor: style.bg, borderColor: style.border }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: style.text }}>{day.label}</p>
                  <p className="mt-0.5 text-[26px] font-semibold leading-none text-[#16130F]">{day.dateLabel}</p>
                </div>
                <span
                  className="mt-1 h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor: style.accent,
                    boxShadow:
                      day.state === 'critical'
                        ? `0 0 10px ${style.accent}`
                        : day.state === 'pressure' || hasUnresolved
                          ? `0 0 8px ${style.accent}`
                          : undefined,
                  }}
                />
              </div>

              <div className="mt-5">
                <p className="text-[11px] font-semibold" style={{ color: style.text }}>{style.label}</p>
                <p className="mt-0.5 text-[12px] text-[#5D5145]">{day.events.length} in view</p>
              </div>

              <p className="mt-3 line-clamp-2 min-h-[34px] text-[12px] leading-snug text-[#5D5145]">
                {next?.title ?? (day.isToday ? 'Holding current operating picture.' : 'No new movement yet.')}
              </p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-white/55 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.1em]" style={{ color: style.text }}>
                  {day.density}
                </span>
                {hasUnresolved && (
                  <span className="rounded-full bg-[#211A13] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#F6D69E]">
                    {day.unresolvedCount} open
                  </span>
                )}
                <span className="rounded-full bg-white/55 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.1em]" style={{ color: style.text }}>
                  {day.continuityState}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
