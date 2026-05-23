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
  const tickerItems = [
    autoscan.currentTruth,
    autoscan.mattersNow,
    autoscan.nextMovement,
  ].filter(Boolean)

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

      <div className="mt-4 rounded-[20px] border border-[#E8DECF] bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(246,241,233,0.96)_100%)] px-3.5 py-2.5 shadow-[0_6px_16px_rgba(17,17,17,0.03)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A7351]">TELAtop</p>
              <span className="telatop-pulse h-1.5 w-1.5 rounded-full bg-[#CDB38A]" />
              <p className="text-[10px] font-medium text-[#8A7351]">{unresolvedCount} in view</p>
            </div>
            <div className="mt-1.5 overflow-hidden rounded-full border border-[#E6DCCF] bg-[#F7F2EA]/90 px-2 py-1">
              <div className="telatop-ticker-track flex min-w-max items-center gap-3 whitespace-nowrap text-[9px] font-medium uppercase tracking-[0.16em] text-[#9D8561]">
                {[...tickerItems, ...tickerItems].map((item, index) => (
                  <div key={`${item}-${index}`} className="flex items-center gap-3">
                    <span>{item}</span>
                    <span className="h-1 w-1 rounded-full bg-[#D2BA93]" />
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-1 text-[12px] font-semibold leading-snug text-[#171411]">{autoscan.currentTruth}</p>
            <p className="mt-1 text-[10px] leading-snug text-[#6E6A63]">{autoscan.mattersNow}</p>
            <p className="mt-1 text-[10px] leading-snug text-[#8A7351]">{autoscan.nextMovement}</p>
          </div>
        </div>
      </div>
      <style jsx>{`
        .telatop-pulse {
          animation: telatopPulse 2.6s ease-in-out infinite;
          box-shadow: 0 0 0 rgba(205, 179, 138, 0.35);
        }

        .telatop-ticker-track {
          animation: telatopTicker 112s linear infinite;
          will-change: transform;
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

        @keyframes telatopTicker {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-50%, 0, 0);
          }
        }
      `}</style>
    </header>
  )
}
