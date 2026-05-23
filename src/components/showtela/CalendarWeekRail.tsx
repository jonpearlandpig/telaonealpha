import type { OperationalCalendarEvent } from '@/lib/showtela/calendar'
import { getWeekDays } from '@/lib/showtela/calendar'

const STATE_STYLES = {
  calm: { label: 'Calm', bg: '#F4EFE6', border: '#E1D5C4', text: '#756A5B', accent: '#8EA58E' },
  active: { label: 'Active', bg: '#FBF1DD', border: '#E2C98F', text: '#75551F', accent: '#C89B2F' },
  pressure: { label: 'Pressure', bg: '#F8E4CE', border: '#E1B276', text: '#7E4F1F', accent: '#D68A3A' },
  critical: { label: 'Critical', bg: '#F4DAD4', border: '#D99689', text: '#7C332A', accent: '#C85B4A' },
  waiting: { label: 'Waiting', bg: '#EEE8DD', border: '#D7CAB8', text: '#665E55', accent: '#8B847B' },
  needs_decision: { label: 'Decision', bg: '#F3DFCA', border: '#DBAB75', text: '#794819', accent: '#B7772D' },
  tela_ready: { label: 'TELA Ready', bg: '#DDEDE8', border: '#8FBDB1', text: '#194E45', accent: '#1F6B5F' },
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
  const activeCount = events.length

  return (
    <section className="pb-6">
      <div className="mb-3 flex items-center justify-between px-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8A7351]">Calendar Pulse</p>
          <h2 className="mt-0.5 text-[18px] font-semibold leading-tight text-[#17130F]">Operational week</h2>
        </div>
        <button
          type="button"
          onClick={onOpenCalendar}
          className="min-h-[36px] rounded-full bg-[#17130F] px-3.5 text-[11px] font-semibold text-[#F7E8C2] shadow-[0_10px_24px_rgba(17,17,17,0.12)]"
        >
          Enter Week
        </button>
      </div>

      <button
        type="button"
        onClick={onOpenCalendar}
        className="mx-5 mb-3 flex w-[calc(100%-2.5rem)] items-center justify-between rounded-[20px] border border-[#E3D6C4] bg-[#FFFDF8] px-4 py-3 text-left shadow-[0_10px_24px_rgba(27,22,16,0.05)]"
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9A7C46]">Temporal Awareness</p>
          <p className="mt-1 text-[13px] leading-snug text-[#5E5348]">{activeCount} derived operational moment{activeCount === 1 ? '' : 's'} across continuity, pressure, and unresolved state.</p>
        </div>
        <span className="ml-3 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#F0E5D3] text-[18px] leading-none text-[#8A6725]">&gt;</span>
      </button>

      <div className="flex snap-x gap-3 overflow-x-auto px-5 pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {days.map((day) => {
          const style = STATE_STYLES[day.state]
          const next = day.nextEvent
          const hasUnresolved = day.unresolvedCount > 0

          return (
            <button
              key={day.key}
              type="button"
              onClick={onOpenCalendar}
              className={`min-h-[184px] w-[138px] flex-shrink-0 snap-start rounded-[22px] border px-3 py-3 text-left shadow-[0_10px_28px_rgba(27,22,16,0.07)] transition-[box-shadow,transform] duration-300 ${day.state === 'critical' ? 'animate-pulse' : ''}`}
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
                        ? `0 0 18px ${style.accent}, 0 0 34px rgba(200,91,74,0.18)`
                        : day.state === 'pressure' || hasUnresolved
                          ? `0 0 16px ${style.accent}`
                          : undefined,
                  }}
                />
              </div>

              <div className="mt-4">
                <p className="text-[11px] font-semibold" style={{ color: style.text }}>{day.events.length} ops</p>
                <p className="mt-0.5 text-[12px] font-semibold text-[#2A231B]">{style.label}</p>
              </div>

              <p className="mt-3 line-clamp-2 min-h-[34px] text-[12px] leading-snug text-[#5D5145]">
                {next?.title ?? (day.isToday ? 'Hold current operating picture.' : 'No derived pressure yet.')}
              </p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-white/55 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.1em]" style={{ color: style.text }}>
                  {day.density}
                </span>
                <span className="rounded-full bg-white/55 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.1em]" style={{ color: style.text }}>
                  {day.continuityState}
                </span>
                {hasUnresolved && (
                  <span className="rounded-full bg-[#211A13] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#F6D69E]">
                    {day.unresolvedCount} open
                  </span>
                )}
              </div>

              {next?.telaHint && (
                <p className="mt-3 line-clamp-1 text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: style.text }}>TELA ready</p>
              )}
            </button>
          )
        })}
      </div>
    </section>
  )
}
