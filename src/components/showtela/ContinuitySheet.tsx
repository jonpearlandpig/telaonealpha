import type { ContinuityEvent, OperationEntity, UnresolvedObject } from '@/lib/showtela/types'

export function ContinuitySheet({ personName, events, unresolved, operations }: { personName: string; events: ContinuityEvent[]; unresolved: UnresolvedObject[]; operations: OperationEntity[] }) {
  return (
    <section className='rounded-3xl bg-white p-4 shadow-sm'>
      <h3 className='text-base font-semibold'>{personName} Continuity</h3>
      <p className='text-xs text-[#5D5A56]'>{events.length} updates • {unresolved.length} unresolved • {operations.length} active ops</p>
    </section>
  )
}
