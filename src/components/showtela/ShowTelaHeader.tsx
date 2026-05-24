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
  latestUpdateLabel,
  trustSignal,
  onNextMovementTap,
}: {
  userName?: string
  unresolvedCount: number
  autoscan: AutoscanSignal
  latestUpdateLabel?: string
  trustSignal?: string
  onNextMovementTap?: () => void
}) {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = userName?.split(' ')[0] ?? 'there'

  return (
    <header className="relative overflow-hidden px-5 pb-8 pt-[58px]">
      <div className="pointer-events-none absolute -right-20 top-12 h-56 w-56 rounded-full bg-[#EFE5D3] blur-3xl" />
      <div className="pointer-events-none absolute left-[-26px] top-24 opacity-[0.2]">
        <p className="origin-top-left rotate-180 text-[72px] font-semibold uppercase tracking-[0.38em] text-[#B7AA95] [writing-mode:vertical-rl]">
          Crusade
        </p>
      </div>

      <div className="relative ml-16">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9A7C46]">Home</p>
          <div className="rounded-full border border-[#E4D8C9] bg-white/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6E6459]">
            {latestUpdateLabel ?? 'Standing by'}
          </div>
        </div>

        <div>
          <p className="text-[12px] font-medium text-[#7D7368]">{greeting}, {firstName}.</p>
          <h1 className="mt-2 max-w-[220px] text-[31px] font-semibold leading-[1.02] tracking-[-0.04em] text-[#171411]">
            The field is present.
          </h1>
          <p className="mt-3 max-w-[240px] text-[14px] leading-relaxed text-[#655A4F]">{autoscan.currentTruth}</p>
        </div>

        <div className="mt-6 rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.78)_0%,rgba(247,241,232,0.9)_100%)] px-4 py-4 shadow-[0_18px_38px_rgba(31,24,18,0.08)] backdrop-blur-[18px]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8B785C]">Now</p>
          <p className="mt-2 text-[15px] leading-relaxed text-[#221C16]">{autoscan.mattersNow}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-[#F2ECE3] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6B5D4B]">
              {unresolvedCount > 0 ? `${unresolvedCount} open` : 'Field calm'}
            </span>
            {trustSignal && (
              <span className="rounded-full bg-[#F2ECE3] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6B5D4B]">
                {trustSignal}
              </span>
            )}
          </div>
          {onNextMovementTap ? (
            <button
              type="button"
              onClick={onNextMovementTap}
              className="mt-4 block text-left text-[12px] font-semibold text-[#8A6725] transition-colors hover:text-[#6F541A]"
            >
              {autoscan.nextMovement}
            </button>
          ) : (
            <p className="mt-4 text-[12px] font-semibold text-[#8A6725]">{autoscan.nextMovement}</p>
          )}
        </div>
      </div>
    </header>
  )
}
