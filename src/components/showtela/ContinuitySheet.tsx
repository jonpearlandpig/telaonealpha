import type { ContinuityEvent, OperationEntity, UnresolvedObject } from '@/lib/showtela/types'

export function ContinuitySheet({ personName, events, unresolved, operations }: { personName: string; events: ContinuityEvent[]; unresolved: UnresolvedObject[]; operations: OperationEntity[] }) {
  const attachments = events.flatMap((event) => event.attachments ?? [])
  return (
    <section className='rounded-3xl bg-white p-4 shadow-sm'>
      <h3 className='text-base font-semibold'>{personName} Continuity</h3>
      <p className='text-xs text-[#5D5A56]'>{events.length} updates • {unresolved.length} unresolved • {operations.length} active ops</p>
      <div className='mt-3 space-y-1.5 text-xs text-[#4D443A]'>
        {events.slice(0, 3).map((event) => <p key={event.id}>• {event.headline} {event.waitingOn ? `· waiting on ${event.waitingOn}` : ''} {event.blockedBy ? `· blocked by ${event.blockedBy}` : ''}</p>)}
      </div>
      {attachments.length ? <div className='mt-3 rounded-2xl border border-[#E5DED2] bg-[#FAF7F2] p-3'><p className='text-[11px] uppercase tracking-[0.14em] text-[#826742]'>Media Memory</p><div className='mt-2 grid grid-cols-2 gap-2'>{attachments.slice(0, 4).map((att) => <div key={att.id} className='rounded-xl border border-black/10 bg-white p-2'><p className='text-[11px] font-medium'>{att.title}</p><p className='text-[10px] text-[#6A5E50]'>{att.type.replace('_', ' ')}</p></div>)}</div></div> : null}
    </section>
  )
}
