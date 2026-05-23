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
  onNextMovementTap,
}: {
  userName?: string
  unresolvedCount: number
  autoscan: AutoscanSignal
  onNextMovementTap?: () => void
}) {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = userName?.split(' ')[0] ?? 'there'

  return (
    <header className="px-5 pb-8 pt-[58px]">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#C89B2F]">Crusade: The Musical</p>
        <button className="relative flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.04]">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 2a4 4 0 00-4 4v3l-1 1.5h10L12 9V6a4 4 0 00-4-4zM6.5 13a1.5 1.5 0 003 0" stroke="#141210" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <div>
        <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.6px] text-[#141210]">{greeting}, {firstName}.</h1>
        <p className="mt-1 text-[15px] leading-snug text-[#6E6A63]">Operations are live.</p>
      </div>

      <div className="mt-6 overflow-hidden rounded-[14px] bg-[linear-gradient(160deg,#FAF7F1_0%,#EEE3CC_100%)] px-4 py-4 shadow-[0_2px_10px_rgba(17,17,17,0.07)]">
        <div className="flex items-center gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#8A7351]">TELAtop</p>
          <span className="telatop-pulse h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#CDB38A]" />
          <p className="text-[10px] font-medium text-[#8A7351]">{unresolvedCount} unresolved</p>
        </div>
        <p className="mt-2 text-[12px] font-semibold leading-snug text-[#171411]">{autoscan.currentTruth}</p>
        <p className="mt-1 text-[11px] leading-relaxed text-[#6E6A63]">{autoscan.mattersNow}</p>
        {onNextMovementTap ? (
          <button
            type="button"
            onClick={onNextMovementTap}
            className="mt-1.5 text-left text-[11px] leading-snug text-[#8A7351] transition-colors hover:text-[#6F541A]"
          >
            {autoscan.nextMovement}
          </button>
        ) : (
          <p className="mt-1.5 text-[11px] leading-snug text-[#8A7351]">{autoscan.nextMovement}</p>
        )}
      </div>
      <style jsx>{`
        .telatop-pulse {
          animation: telatopPulse 2.6s ease-in-out infinite;
          box-shadow: 0 0 0 rgba(205, 179, 138, 0.35);
        }

        @keyframes telatopPulse {
          0%,
          100% {
            opacity: 0.5;
            transform: scale(0.9);
            box-shadow: 0 0 0 0 rgba(205, 179, 138, 0.16);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
            box-shadow: 0 0 0 4px rgba(205, 179, 138, 0);
          }
        }
      `}</style>
    </header>
  )
}
