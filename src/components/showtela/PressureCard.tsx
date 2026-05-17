export function PressureCard({ total, high, medium }: { total: number; high: number; medium: number }) {
  return <section className='px-5 pb-6'><div className='rounded-[1.45rem] border border-[#D3B174]/40 bg-[linear-gradient(160deg,#1A1815_0%,#080706_100%)] p-5 text-[#F3EBD8] shadow-[0_20px_46px_rgba(0,0,0,0.34)]'><div className='text-[11px] uppercase tracking-[0.2em] text-[#CEB07A]'>Unresolved Pressure</div><div className='mt-2 text-lg font-semibold'>{total} items need attention</div><div className='mt-1 text-sm text-[#D5C6A9]'>{high} high • {medium} medium pressure</div></div></section>
}
