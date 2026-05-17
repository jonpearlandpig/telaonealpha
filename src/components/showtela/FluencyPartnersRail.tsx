import type { PersonEntity } from '@/lib/showtela/types'

export function FluencyPartnersRail({ people }: { people: PersonEntity[] }) {
  return <section className='px-5 pb-4'><h2 className='text-sm font-medium'>Fluency Partners</h2><div className='mt-3 flex gap-3 overflow-x-auto'>{people.map((p) => <div key={p.id} className='min-w-24 rounded-2xl bg-white p-3 shadow-sm'><div className='text-sm font-medium'>{p.name}</div><div className='text-xs text-[#5D5A56]'>{p.role ?? 'Partner'}</div></div>)}</div></section>
}
