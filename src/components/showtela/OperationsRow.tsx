import type { OperationEntity } from '@/lib/showtela/types'

export function OperationsRow({ operations }: { operations: OperationEntity[] }) {
  return <section className='px-5 pb-5'><h2 className='text-xs font-semibold uppercase tracking-[0.18em] text-[#84663A]'>Operations</h2><div className='mt-3 grid grid-cols-2 gap-3'>{operations.slice(0,5).map((o) => <div key={o.id} className='rounded-[1.25rem] border border-[#E8DCC5] bg-[linear-gradient(160deg,#FFFDF8_0%,#F4E9DA_100%)] p-3 shadow-[0_14px_26px_rgba(25,20,14,0.08)]'><div className='text-sm font-semibold text-[#18150F]'>{o.title}</div><div className='mt-1 text-xs text-[#6A5D4C]'>{o.latestMovement ?? 'No movement'}</div><div className='mt-2 text-[11px] font-medium text-[#8B6E45]'>{o.unresolvedCount ? `${o.unresolvedCount} pending` : 'All clear'}</div></div>)}</div></section>
}
