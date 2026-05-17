export function PressureCard({ total, high, medium }: { total: number; high: number; medium: number }) {
  return <section className='px-5 pb-4'><div className='rounded-2xl bg-[#111111] p-4 text-white'><div className='text-base font-semibold'>{total} items need attention</div><div className='text-sm text-white/80'>{high} high • {medium} medium pressure</div></div></section>
}
