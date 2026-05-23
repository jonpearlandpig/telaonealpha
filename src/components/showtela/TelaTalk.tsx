'use client'

type AutoscanAction = {
  id: string
  label: string
  detail: string
}

type AutoscanSummary = {
  currentTruth: string
  mattersNow: string
  nextMovement: string
  suggestedActions: AutoscanAction[]
  latestChange?: string
  activeOperators: string[]
}

export function TelaTalk({
  autoscan,
}: {
  autoscan: AutoscanSummary
}) {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#F6F2EA_0%,#EFE6D7_100%)] px-5 pb-32 pt-14">
      <div className="rounded-[28px] border border-[#2A231A] bg-[radial-gradient(circle_at_top,#372C1E_0%,#17130F_68%)] p-4 text-[#F5EEDC] shadow-[0_20px_44px_rgba(20,18,16,0.18)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#D7BC7F]">TELA</p>
            <h1 className="mt-1.5 text-[24px] font-semibold tracking-[-0.04em]">Persistent Operational Presence</h1>
          </div>
          <div className="rounded-full border border-[#5A4725] bg-[#221B13] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#DABD79]">
            Crusade
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#C8B28A]">Current Operational Truth</p>
            <p className="mt-1 text-[17px] font-semibold leading-tight">{autoscan.currentTruth}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#C8B28A]">What Matters Now</p>
            <p className="mt-1 text-[13px] leading-relaxed text-[#DDD1BB]">{autoscan.mattersNow}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#C8B28A]">Next Meaningful Movement</p>
            <p className="mt-1 text-[13px] leading-relaxed text-[#DDD1BB]">{autoscan.nextMovement}</p>
          </div>
        </div>
      </div>

      <section className="mt-4 rounded-[24px] border border-[#E3D8C7] bg-white/82 p-4 shadow-[0_14px_34px_rgba(17,17,17,0.06)] backdrop-blur-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8A7351]">Field Scan</p>
            <p className="mt-1 text-[14px] font-semibold text-[#171411]">Ambient intelligence across the field.</p>
          </div>
        </div>
        {autoscan.latestChange && (
          <div className="mt-4 rounded-[18px] bg-[#F7F1E7] px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8A7351]">Latest Continuity Change</p>
            <p className="mt-1 text-[13px] leading-relaxed text-[#5E5348]">{autoscan.latestChange}</p>
          </div>
        )}
        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8A7351]">Suggested Next Actions</p>
          <div className="mt-2 space-y-2">
            {autoscan.suggestedActions.map((action, index) => (
              <div key={action.id} className="rounded-[18px] border border-[#ECE3D6] bg-[#FCFAF7] px-4 py-3">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#171411] text-[11px] font-semibold text-[#F6EFDF]">{index + 1}</span>
                  <div>
                    <p className="text-[13px] font-semibold text-[#171411]">{action.label}</p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-[#6B5D4B]">{action.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-[24px] border border-[#E3D8C7] bg-white/82 p-4 shadow-[0_14px_34px_rgba(17,17,17,0.06)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8A7351]">Active Operators</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {autoscan.activeOperators.map((name) => (
            <span key={name} className="rounded-full border border-[#DDD1BF] bg-[#F5F0E6] px-3 py-1.5 text-[12px] font-medium text-[#5E5348]">
              {name}
            </span>
          ))}
        </div>
      </section>
    </div>
  )
}
