import type { PersonEntity } from '@/lib/showtela/types'

export function FluencyPartnersRail(props: { people: PersonEntity[] } | { items: Array<{ id: string; label?: string; name?: string; unresolvedCount: number; image: string }> }) {
  const people = 'people' in props ? props.people : props.items.map((i) => ({ id: i.id, name: i.label ?? i.name ?? 'Partner', unresolvedCount: i.unresolvedCount, role: 'Partner' }))
  return <section className='px-5 pb-5'><h2 className='text-xs font-semibold uppercase tracking-[0.18em] text-[#84663A]'>Fluency Partners</h2><div className='mt-3 flex gap-3 overflow-x-auto pb-1'>{people.map((p) => <div key={p.id} className='min-w-28 rounded-[1.3rem] border border-[#E4D3B2]/80 bg-[#171411] p-3 shadow-[0_14px_34px_rgba(0,0,0,0.3)]'><div className='mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#D8B575] bg-[#262018] text-sm font-semibold text-[#F6DEAF]'>{p.name.slice(0, 1)}</div><div className='text-sm font-semibold text-[#F6EDDB]'>{p.name}</div><div className='text-xs text-[#CDBD9C]'>{p.role ?? 'Partner'}</div></div>)}</div></section>
}
