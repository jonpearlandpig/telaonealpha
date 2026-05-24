import type { OperationalCalendarEvent } from '@/lib/showtela/calendar'
import { getWeekDays } from '@/lib/showtela/calendar'

const STATE_STYLES = {
  calm: { label: 'Calm', bg: '#F7F2E9', text: '#756A5B', accent: '#8EA58E' },
  active: { label: 'Active', bg: '#FBF4E7', text: '#75551F', accent: '#C89B2F' },
  pressure: { label: 'Attention Needed', bg: '#FBEEE1', text: '#7E4F1F', accent: '#D68A3A' },
  critical: { label: 'Attention Needed', bg: '#F7E6E1', text: '#7C332A', accent: '#C85B4A' },
  waiting: { label: 'Watching', bg: '#F1ECE4', text: '#665E55', accent: '#8B847B' },
  needs_decision: { label: 'Attention Needed', bg: '#F8ECE0', text: '#794819', accent: '#B7772D' },
  tela_ready: { label: 'Active', bg: '#E7F2EE', text: '#194E45', accent: '#1F6B5F' },
}

function summaryLine(day: ReturnType<typeof getWeekDays>[number]) {
  if (day.nextEvent?.unresolvedCount) return 'One thing to confirm'
  if (day.nextEvent?.continuityState === 'fresh') return 'Fresh update'
  if (day.events.length === 0) return day.isToday ? 'Mostly open' : 'Quiet day'
  return day.nextEvent?.title ?? 'Holding steady'
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
    <section className="pb-9">
      <div className="mb-4 px-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8A7351]">Calendar</p>
      </div>

      <div className="flex snap-x gap-4 overflow-x-auto px-5 pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {days.map((day) => {
          const style = STATE_STYLES[day.state]

          return (
            <button
              key={day.key}
              type="button"
              onClick={onOpenCalendar}
              className="min-h-[154px] w-[144px] flex-shrink-0 snap-start rounded-[30px] px-5 py-5 text-left shadow-[0_10px_26px_rgba(27,22,16,0.05)] transition-transform duration-300 active:scale-[0.98]"
              style={{ backgroundColor: style.bg }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: style.text }}>{day.label}</p>
                  <p className="mt-2 text-[30px] font-semibold leading-none text-[#16130F]">{day.dateLabel}</p>
                </div>
                <span className="mt-1 h-3 w-3 rounded-full" style={{ backgroundColor: style.accent }} />
              </div>

              <p className="mt-7 text-[12px] font-semibold text-[#2A231B]">{style.label}</p>
              <p className="mt-3 line-clamp-3 text-[12px] leading-[1.45] text-[#5D5145]">
                {summaryLine(day)}
              </p>
            </button>
          )
        })}
      </div>
    </section>
  )
}
