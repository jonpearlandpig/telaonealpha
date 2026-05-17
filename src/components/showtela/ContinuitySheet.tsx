import type { ContinuityEvent, OperationEntity, UnresolvedObject } from '@/lib/showtela/types'

type Props = {
  personName: string
  role?: string
  notes?: string
  communicationRhythm?: string
  latestContinuity?: string
  events: ContinuityEvent[]
  unresolved: UnresolvedObject[]
  operations: OperationEntity[]
  open: boolean
  onClose: () => void
}

export function ContinuitySheet({ personName, role, notes, communicationRhythm, latestContinuity, events, unresolved, operations, open, onClose }: Props) {
  if (!open) return null
  return (
    <>
      <button onClick={onClose} className='fixed inset-0 z-40 bg-black/35 backdrop-blur-[2px] transition-opacity duration-200' aria-label='Close continuity sheet' />
      <section className='fixed inset-x-3 bottom-3 z-50 max-h-[78vh] animate-[slideUp_.24s_ease-out] overflow-y-auto rounded-[1.7rem] border border-[#E7D8BF] bg-[#FFF8EE] p-5 shadow-[0_28px_60px_rgba(0,0,0,0.3)]'>
            <div className='flex items-start justify-between gap-3'>
              <div><h3 className='text-lg font-semibold text-[#16130E]'>{personName}</h3><p className='text-xs text-[#6C5F4E]'>{role ?? 'Operational entity'} • {communicationRhythm ?? 'Daily communication rhythm'}</p></div>
              <button onClick={onClose} className='rounded-full border border-[#DCC8A0] px-3 py-1 text-xs text-[#7B6340] transition active:scale-95'>Close</button>
            </div>
            <p className='mt-3 text-sm text-[#5E5142]'>{latestContinuity ?? 'No continuity summary yet.'}</p>
            <p className='mt-2 text-xs text-[#7A6852]'>{notes ?? 'Operational notes not yet captured.'}</p>
            <div className='mt-4 rounded-2xl bg-[#15120E] p-3 text-[#F0E3CC]'><p className='text-[11px] uppercase tracking-[0.14em] text-[#D5B778]'>Unresolved threads</p><p className='mt-1 text-sm'>{unresolved.length} unresolved • {operations.length} linked operations • {events.length} updates</p></div>
            <div className='mt-4 grid grid-cols-2 gap-3'>
              <div className='rounded-xl border border-[#E4D1AF] bg-white/70 p-3'><p className='text-[11px] uppercase tracking-[0.12em] text-[#8A6D42]'>Approvals waiting</p><p className='mt-1 text-sm text-[#2A2218]'>{unresolved.filter((u) => (u.title || '').toLowerCase().includes('approval')).length}</p></div>
              <div className='rounded-xl border border-[#E4D1AF] bg-white/70 p-3'><p className='text-[11px] uppercase tracking-[0.12em] text-[#8A6D42]'>Blockers</p><p className='mt-1 text-sm text-[#2A2218]'>{unresolved.filter((u) => u.blocking).length}</p></div>
            </div>
            <div className='mt-4'><p className='text-[11px] uppercase tracking-[0.12em] text-[#8A6D42]'>Continuity timeline</p><div className='mt-2 space-y-2'>{events.slice(0, 4).map((e) => <div key={e.id} className='rounded-xl border border-[#E6D7BD] bg-white/80 p-3'><p className='text-sm text-[#20190F]'>{e.headline}</p><p className='mt-1 text-[11px] text-[#7D6B54]'>{e.timestamp ?? 'No timestamp'} • {e.owner?.name ?? 'Owner unassigned'}</p></div>)}</div></div>
            <div className='mt-4'><p className='text-[11px] uppercase tracking-[0.12em] text-[#8A6D42]'>Next expected action</p><p className='mt-1 text-sm text-[#3A2F21]'>Resolve highest-pressure unresolved thread and post continuity confirmation in next communication rhythm window.</p></div>
      </section>
    </>
  )
}
