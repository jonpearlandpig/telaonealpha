'use client'

type AutoscanSignal = {
  currentTruth: string
  mattersNow: string
  nextMovement: string
}

export function ShowTelaHeader({
  userName,
  unresolvedCount,
  autoscan,
}: {
  userName?: string
  unresolvedCount: number
  autoscan: AutoscanSignal
}) {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = userName?.split(' ')[0] ?? 'there'

  return (
    <header className="px-5 pb-6 pt-[58px]">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#C89B2F]/60 bg-[#141210]">
            <span className="text-[11px] font-semibold tracking-tight text-[#D8A742]">ST</span>
          </div>
          <div>
            <p className="text-[16px] font-semibold tracking-tight text-[#141210]">SHOWTELA</p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#C89B2F]">Crusade: The Musical</p>
          </div>
        </div>
        <button className="relative flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.04]">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 2a4 4 0 00-4 4v3l-1 1.5h10L12 9V6a4 4 0 00-4-4zM6.5 13a1.5 1.5 0 003 0" stroke="#141210" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border border-[#F8F6F2] bg-[#C89B2F]" />
        </button>
      </div>

      <div>
        <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.6px] text-[#141210]">{greeting}, {firstName}.</h1>
        <p className="mt-1 text-[15px] leading-snug text-[#6E6A63]">Here&apos;s what&apos;s live on the Crusade.</p>
      </div>

      <div className="mt-4 rounded-[24px] border border-[#E8DECF] bg-[linear-gradient(180deg,rgba(255,255,255,0.9)_0%,rgba(244,239,230,0.94)_100%)] px-4 py-4 shadow-[0_10px_28px_rgba(17,17,17,0.04)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8A7351]">Ambient Autoscan</p>
            <p className="mt-1 text-[14px] font-semibold text-[#171411]">{autoscan.currentTruth}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-[#6E6A63]">{autoscan.mattersNow}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-[#8A7351]">{autoscan.nextMovement}</p>
          </div>
          <div className="rounded-full border border-[#D9CEBD] bg-[#F4EFE6] px-2.5 py-1">
            <span className="flex items-center gap-1 text-[11px] font-medium text-[#6B5D4B]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#6FAE7B]" />
              {unresolvedCount} in view
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
