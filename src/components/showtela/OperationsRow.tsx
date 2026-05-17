import type { OperationEntity } from '@/lib/showtela/types'

export function OperationsRow({ operations }: { operations: OperationEntity[] }) {
  return <section className='px-5 pb-4'><h2 className='text-sm font-medium'>Operations</h2><div className='mt-3 grid grid-cols-2 gap-3'>{operations.slice(0,5).map((o) => <div key={o.id} className='rounded-2xl bg-white p-3 shadow-sm'><div className='text-sm font-medium'>{o.title}</div><div className='text-xs text-[#5D5A56]'>{o.latestMovement ?? 'No movement'}</div><div className='text-xs'>{o.unresolvedCount ? `${o.unresolvedCount} pending` : 'All clear'}</div></div>)}</div></section>
}
