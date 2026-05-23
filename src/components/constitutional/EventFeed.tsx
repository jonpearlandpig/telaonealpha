import type { ConstitutionalEvent } from '@/lib/constitutional/types'
import { EventCard } from './EventCard'

export function EventFeed({ events }: { events: ConstitutionalEvent[] }) {
  return (
    <section className="rounded-[24px] border border-[#302B23] bg-[#0F1824] px-4 py-4 text-[#F7EBD6] shadow-[0_18px_38px_rgba(15,24,36,0.16)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#C8A85F]">Constitutional Events</p>
          <h2 className="mt-1 text-[18px] font-semibold leading-tight">Event spine</h2>
        </div>
        <span className="rounded-full border border-[#4A402F] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#D7C69E]">
          Append-only
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
        {events.length === 0 && (
          <div className="rounded-[18px] border border-dashed border-[#4A402F] px-3 py-5 text-center">
            <p className="text-[13px] font-semibold text-[#E8DCC8]">No constitutional events appended yet.</p>
            <p className="mt-1 text-[12px] leading-relaxed text-[#B8AC98]">The immutable spine is ready for governed continuity creation.</p>
          </div>
        )}
      </div>
    </section>
  )
}
