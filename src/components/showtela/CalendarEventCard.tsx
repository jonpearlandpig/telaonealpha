import type { OperationalCalendarEvent } from '@/lib/showtela/calendar'
import { formatOperationalTime } from '@/lib/showtela/calendar'

const STATE_TONES: Record<OperationalCalendarEvent['pressureState'], { label: string; dot: string; text: string; bg: string }> = {
  calm: { label: 'Calm', dot: '#8EA58E', text: '#627160', bg: '#EFF3EA' },
  active: { label: 'Active', dot: '#C89B2F', text: '#8A6725', bg: '#F6EEDB' },
  pressure: { label: 'Pressure', dot: '#D68A3A', text: '#8F5520', bg: '#F8E6D3' },
  critical: { label: 'Critical', dot: '#C85B4A', text: '#8E352C', bg: '#F7DDD8' },
  waiting: { label: 'Waiting', dot: '#8B847B', text: '#625B54', bg: '#ECE7DF' },
  needs_decision: { label: 'Needs Decision', dot: '#B7772D', text: '#7A481C', bg: '#F5E2CD' },
  tela_ready: { label: 'TELA Ready', dot: '#1F6B5F', text: '#174E46', bg: '#DCEDE8' },
}

function metaLine(values: string[]) {
  return values.filter(Boolean).slice(0, 3).join(' / ')
}

export function CalendarEventCard({ event }: { event: OperationalCalendarEvent }) {
  const tone = STATE_TONES[event.pressureState]
  const people = metaLine(event.people)
  const departments = metaLine(event.departments)

  return (
    <article data-testid="calendar-event-card" className="rounded-[22px] border border-[#E8DDCC] bg-[#FFFDF8] px-4 py-4 shadow-[0_10px_28px_rgba(27,22,16,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: tone.dot }} />
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: tone.text }}>
              {event.type} / {tone.label}
            </p>
          </div>
          <h3 className="mt-2 text-[17px] font-semibold leading-tight text-[#16130F]">{event.title}</h3>
        </div>
        <div className="flex-shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ backgroundColor: tone.bg, color: tone.text }}>
          {formatOperationalTime(event.startTime ?? event.timestamp)}
        </div>
      </div>

      {event.summary && (
        <p className="mt-2 text-[13px] leading-relaxed text-[#62564B]">{event.summary}</p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-[14px] bg-[#F6F0E7] px-3 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#9A825F]">People</p>
          <p className="mt-1 line-clamp-1 text-[12px] font-medium text-[#29231C]">{people || 'Open assignment'}</p>
        </div>
        <div className="rounded-[14px] bg-[#F6F0E7] px-3 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#9A825F]">Entity</p>
          <p className="mt-1 line-clamp-1 text-[12px] font-medium text-[#29231C]">{departments || 'Runtime field'}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {event.location && (
          <span className="rounded-full bg-[#EFE8DA] px-2.5 py-1 text-[11px] font-medium text-[#6B5D4B]">{event.location}</span>
        )}
        <span className="rounded-full bg-[#EFE8DA] px-2.5 py-1 text-[11px] font-medium text-[#6B5D4B]">{event.continuityState} continuity</span>
        <span className="rounded-full bg-[#EFE8DA] px-2.5 py-1 text-[11px] font-medium text-[#6B5D4B]">{event.density} density</span>
        {event.unresolvedCount > 0 && (
          <span className="rounded-full bg-[#2A2118] px-2.5 py-1 text-[11px] font-semibold text-[#F4D7A1]">{event.unresolvedCount} unresolved</span>
        )}
      </div>

      {event.telaHint && (
        <div className="mt-3 rounded-[16px] border border-[#E3D3B8] bg-[#FBF5EA] px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9A7C46]">TELA Context</p>
          <p className="mt-1 text-[12px] leading-relaxed text-[#5B4D3D]">{event.telaHint}</p>
        </div>
      )}
    </article>
  )
}
