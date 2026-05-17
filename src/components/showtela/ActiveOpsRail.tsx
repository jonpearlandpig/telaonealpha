import type { PersonEntity } from '@/lib/showtela/types'

export function ActiveOpsRail(props: { people: PersonEntity[] } | { items: Array<{ id: string; name: string; latest?: string; unresolvedCount: number; image: string }> }) {
  const people = 'people' in props ? props.people : props.items.map((i) => ({ id: i.id, name: i.name, role: i.latest, unresolvedCount: i.unresolvedCount, updatesCount: 0 }))
  return <section className='px-5 pb-4'><h2 className='text-sm font-medium'>Active Ops</h2><div className='mt-3 flex gap-3 overflow-x-auto'>{people.map((p) => <button key={p.id} className='min-w-24 rounded-2xl bg-white p-3 text-left shadow-sm'><div className='text-sm font-medium'>{p.name}</div><div className='text-xs text-[#5D5A56]'>{p.role ?? 'Operator'}</div><div className='text-xs'>{p.unresolvedCount ?? 0} unresolved • {p.updatesCount ?? 0} updates</div></button>)}</div></section>
}
