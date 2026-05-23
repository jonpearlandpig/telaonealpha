import type { OperationalCalendarEvent } from '@/lib/showtela/calendar'

const ACTIONS = [
  'Ask TELA',
  'Explain Why',
  'Summarize Continuity',
  'Schedule Follow-up',
  'Email Participants',
  'Prepare Digest',
  'Route to Department',
  'Mark Unresolved',
  'Escalate',
  'Create Update',
  'Create Lineage Event',
  'Create Linked Note',
]

export function TelaCalendarActionPanel({ selectedEvent }: { selectedEvent?: OperationalCalendarEvent }) {
  return (
    <section className="rounded-[24px] border border-[#D8C59D] bg-[#17130F] px-4 py-4 text-[#F8F1E2] shadow-[0_18px_38px_rgba(20,16,12,0.18)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#D7BC7F]">TELA Ready</p>
          <h2 className="mt-1 text-[17px] font-semibold leading-tight">Calendar command entry</h2>
        </div>
        <span className="rounded-full border border-[#D7BC7F]/35 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#E7D2A1]">
          Prepared
        </span>
      </div>

      <p className="mt-2 text-[12px] leading-relaxed text-[#D8CDB8]">
        {selectedEvent
          ? `Prepared actions are scoped to ${selectedEvent.title}. Automation is not wired yet.`
          : 'Prepared actions are available once an operational event is selected. Automation is not wired yet.'}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {ACTIONS.map((action) => (
          <button
            key={action}
            type="button"
            className="min-h-[44px] rounded-[14px] border border-white/10 bg-white/[0.06] px-3 py-2 text-left text-[11px] font-semibold leading-tight text-[#F8F1E2]"
            aria-label={`${action} prepared action`}
          >
            {action}
            <span className="mt-1 block text-[9px] font-medium uppercase tracking-[0.12em] text-[#B7A889]">Prepared</span>
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-[16px] border border-[#D7BC7F]/20 bg-[#241C14] px-3 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#D7BC7F]">Reasoning Hook</p>
        <p className="mt-1 text-[12px] leading-relaxed text-[#D8CDB8]">
          Explain Why is reserved for future TELA reasoning across pressure, people, timing, and lineage.
        </p>
      </div>
    </section>
  )
}
