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
    <section className="rounded-[24px] border border-[#E3D7C6] bg-[#FFF9F1] px-4 py-4 text-[#2C241C] shadow-[0_14px_30px_rgba(20,16,12,0.07)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9A7C46]">Helpful Actions</p>
          <h2 className="mt-1 text-[17px] font-semibold leading-tight">Gentle follow-ups for this day</h2>
        </div>
        <span className="rounded-full bg-[#F3EADB] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8A6725]">
          Ready
        </span>
      </div>

      <p className="mt-2 text-[12px] leading-relaxed text-[#6B5D4B]">
        {selectedEvent
          ? `These follow-ups stay scoped to ${selectedEvent.title}. Automation is not wired yet.`
          : 'These follow-ups become more specific once a calendar item is selected. Automation is not wired yet.'}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {ACTIONS.map((action) => (
          <button
            key={action}
            type="button"
            className="min-h-[44px] rounded-[14px] border border-[#E7DCCB] bg-white px-3 py-2 text-left text-[11px] font-semibold leading-tight text-[#2C241C]"
            aria-label={`${action} prepared action`}
          >
            {action}
            <span className="mt-1 block text-[9px] font-medium uppercase tracking-[0.12em] text-[#9A8A76]">Ready</span>
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-[16px] border border-[#E7DCCB] bg-[#FCF6EC] px-3 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9A7C46]">Why This Is Here</p>
        <p className="mt-1 text-[12px] leading-relaxed text-[#6B5D4B]">
          Explain Why stays available for future TELA reasoning across timing, people, dependency, and lineage.
        </p>
      </div>
    </section>
  )
}
