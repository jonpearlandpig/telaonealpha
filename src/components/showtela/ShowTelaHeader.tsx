'use client'

export function ShowTelaHeader({ userName, userImage }: { userName?: string; userImage?: string }) {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = userName?.split(' ')[0] ?? 'there'

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
      <div>
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.5px] text-[#141210]">{greeting}, {firstName}.</h1>
        <p className="mt-0.5 text-[15px] text-[#6E6A63]">Here&apos;s what matters today.</p>
      </div>
    </header>
  )
}
