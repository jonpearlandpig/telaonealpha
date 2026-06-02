'use client'

type AutoscanSignal = {
  currentTruth: string
  mattersNow: string
  nextMovement: string
  blockersLabel?: string
  movementLabel?: string
  readinessLabel?: string
}

export function ShowTelaHeader({
  userName,
  autoscan,
  onNextMovementTap,
  isEmpty,
  runtimeLabel,
  statusLabel,
}: {
  userName?: string
  autoscan: AutoscanSignal
  onNextMovementTap?: () => void
  isEmpty?: boolean
  runtimeLabel?: string
  statusLabel?: string
}) {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = userName?.split(' ')[0] ?? 'there'

  const tickerItems = [
    autoscan.currentTruth,
    autoscan.mattersNow,
    autoscan.nextMovement,
    autoscan.blockersLabel,
    autoscan.movementLabel,
    autoscan.readinessLabel,
    'approvals holding steady',
  ].filter(Boolean)
  const tickerText = tickerItems.join('  /  ')

  return (
    <header className="px-5 pb-9 pt-[58px]">
      <div className="mb-10 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C89B2F]">{runtimeLabel ?? 'ShowTELA'}</p>
        <button className="relative flex h-12 w-12 items-center justify-center rounded-full bg-black/[0.035]">
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
            <path d="M8 2a4 4 0 00-4 4v3l-1 1.5h10L12 9V6a4 4 0 00-4-4zM6.5 13a1.5 1.5 0 003 0" stroke="#141210" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <div>
        <h1 className="text-[40px] font-semibold leading-[0.98] tracking-[-1.8px] text-[#141210]">{greeting}, {firstName}.</h1>
        <p className="mt-2 text-[17px] leading-snug text-[#6E6A63]">
          {isEmpty ? 'Operations are ready.' : 'Operations are live.'}
        </p>
      </div>

      {isEmpty ? (
        <div className="mt-8 overflow-hidden rounded-[20px] bg-[linear-gradient(160deg,#FCF9F2_0%,#F1E6D0_100%)] px-7 py-6 shadow-[0_10px_28px_rgba(17,17,17,0.05)]">
          <div className="flex items-center gap-1.5">
            <p className="text-[11px] font-medium tracking-[0.06em] text-[#8A7351]">TELAtop</p>
            <span className="telatop-pulse h-2 w-2 flex-shrink-0 rounded-full bg-[#D5C1A1]" />
          </div>
          <p className="mt-6 max-w-[34ch] text-[15px] font-semibold leading-[1.35] tracking-[-0.2px] text-[#171411]">Awaiting first update.</p>
          <p className="mt-4 max-w-[34ch] text-[12px] leading-[1.55] text-[#6E6A63]">Add a call sheet, production document, or update to begin.</p>
        </div>
      ) : (
        <div className="mt-8 overflow-hidden rounded-[20px] bg-[linear-gradient(160deg,#FCF9F2_0%,#F1E6D0_100%)] px-7 py-6 shadow-[0_10px_28px_rgba(17,17,17,0.05)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <p className="text-[11px] font-medium tracking-[0.06em] text-[#8A7351]">TELAtop</p>
              <span className="telatop-pulse h-2 w-2 flex-shrink-0 rounded-full bg-[#D5C1A1]" />
            </div>
            <p className="text-[11px] font-medium text-[#A89880]">{statusLabel ?? 'live view'}</p>
          </div>
          <p className="mt-6 max-w-[34ch] text-[15px] font-semibold leading-[1.35] tracking-[-0.2px] text-[#171411]">{autoscan.currentTruth}</p>
          <p className="mt-4 max-w-[34ch] text-[12px] leading-[1.55] text-[#6E6A63]">{autoscan.mattersNow}</p>
          {onNextMovementTap ? (
            <button
              type="button"
              onClick={onNextMovementTap}
              className="mt-4 text-left text-[12px] leading-snug text-[#8A7351] transition-colors hover:text-[#6F541A]"
            >
              {autoscan.nextMovement}
            </button>
          ) : (
            <p className="mt-4 text-[12px] leading-snug text-[#8A7351]">{autoscan.nextMovement}</p>
          )}
          <div className="mt-7 overflow-hidden border-t border-[#D8CAB4]/70 pt-4">
            <div className="telatop-ticker flex w-max whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9A825F]">
              <span className="pr-10">{tickerText}</span>
              <span className="pr-10" aria-hidden="true">{tickerText}</span>
            </div>
          </div>
        </div>
      )}

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

        .telatop-ticker {
          animation: telatopTicker 42s linear infinite;
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
