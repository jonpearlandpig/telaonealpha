'use client'

import type { ContinuityEvent, OperationEntity, UnresolvedObject } from '@/lib/showtela/types'

export function ContinuitySheet({ title, subtitle, events, unresolved, operations, open, onClose }: { title: string; subtitle: string; events: ContinuityEvent[]; unresolved: UnresolvedObject[]; operations: OperationEntity[]; open: boolean; onClose: () => void }) {
  return (
    <>
      <button aria-label='close sheet' onClick={onClose} className={`fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`} />
      <section className={`fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[430px] rounded-t-[28px] bg-white p-5 shadow-[0_-18px_50px_rgba(0,0,0,0.18)] transition-transform duration-300 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] ${open ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className='mx-auto mb-3 h-1.5 w-12 rounded-full bg-black/10' />
        <h3 className='text-[18px] font-semibold'>{title}</h3>
        <p className='text-[12px] text-[#8B847B]'>{subtitle}</p>
        <p className='mt-3 text-[13px] text-[#5D5A56]'>{events.length} updates • {unresolved.length} unresolved • {operations.length} linked ops</p>
      </section>
    </>
  )
}
