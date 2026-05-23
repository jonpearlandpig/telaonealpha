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
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C89B2F]">Crusade: The Musical</p>
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

      <div className="mt-4 rounded-[22px] border border-[#E8DECF] bg-[linear-gradient(180deg,rgba(255,255,255,0.88)_0%,rgba(244,239,230,0.92)_100%)] px-4 py-3 shadow-[0_8px_20px_rgba(17,17,17,0.035)]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8A7351]">TELAtop</p>
            <p className="mt-1 text-[13px] font-semibold leading-snug text-[#171411]">{autoscan.currentTruth}</p>
            <p className="mt-1 text-[11px] leading-snug text-[#6E6A63]">{autoscan.mattersNow}</p>
            <p className="mt-1 text-[11px] leading-snug text-[#8A7351]">{autoscan.nextMovement}</p>
          </div>
          <div className="rounded-full border border-[#D9CEBD] bg-[#F4EFE6] px-2 py-0.5">
            <span className="text-[10px] font-medium text-[#6B5D4B]">
              {unresolvedCount} in view
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
