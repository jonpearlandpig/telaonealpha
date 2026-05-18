'use client'

export function ShowTelaHeader() {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  return (
    <header className="px-5 pb-4 pt-[58px]">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#C89B2F]/60 bg-[#141210]">
            <span className="text-[11px] font-semibold tracking-tight text-[#D8A742]">ST</span>
          </div>
          <div>
            <p className="text-[13px] font-semibold tracking-tight text-[#141210]">SHOWTELA</p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#C89B2F]">Crusade: The Musical</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex h-9 w-9 items-center justify-center rounded-full bg-black/5">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="#141210" strokeWidth="1.5"/><path d="M10 10l3 3" stroke="#141210" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
          <button className="relative flex h-9 w-9 items-center justify-center rounded-full bg-black/5">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2a4 4 0 00-4 4v3l-1 1.5h10L12 9V6a4 4 0 00-4-4zM6.5 13a1.5 1.5 0 003 0" stroke="#141210" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border border-white bg-[#C89B2F]"/>
          </button>
        </div>
      </div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.5px] text-[#141210]">{greeting}, Jon.</h1>
          <p className="mt-0.5 text-[15px] text-[#6E6A63]">Here&apos;s what matters today.</p>
        </div>
        <div className="min-w-[130px] rounded-2xl border border-black/8 bg-white/80 px-3 py-2.5 text-right shadow-[0_4px_14px_rgba(17,17,17,0.06)] backdrop-blur-md">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#C89B2F]">Hershey, PA</p>
          <div className="mt-0.5 flex items-center justify-end gap-1">
            <span className="text-[13px]">⛅</span>
            <p className="text-[16px] font-semibold text-[#141210]">63°</p>
          </div>
          <p className="text-[10px] font-medium text-[#5E5348]">Show Day · 6</p>
          <p className="text-[10px] text-[#8B847B]">Sat, May 16</p>
        </div>
      </div>
    </header>
  )
}
