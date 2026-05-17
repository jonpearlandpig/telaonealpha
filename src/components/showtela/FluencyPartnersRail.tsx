import type { PersonEntity } from '@/lib/showtela/types'
import { OperationalImage } from './OperationalImage'

export function FluencyPartnersRail({ people }: { people: PersonEntity[] }) {
  return <section className='px-7 pt-5'><h2 className='text-[12px] uppercase tracking-[0.24em] text-[#8B847B]'>Fluency Partners</h2><div className='mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [overscroll-behavior-x:contain] [&::-webkit-scrollbar]:hidden'>{people.map((p) => <article key={p.id} className='w-[72px] shrink-0 snap-start text-center'><button className='transition-transform duration-200 active:scale-95'><div className='mx-auto h-[58px] w-[58px] rounded-full border border-[#C89B2F]/35 p-[2px]'><OperationalImage src={p.avatar ?? 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?q=80&w=300&auto=format&fit=crop'} alt={p.name} className='h-full w-full rounded-full object-cover opacity-95' /></div></button><p className='mt-2 text-[11px] text-[#5D5A56]'>{p.name}</p></article>)}</div></section>
}
