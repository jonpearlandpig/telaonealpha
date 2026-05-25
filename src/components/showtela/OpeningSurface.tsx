'use client'

export function OpeningSurface() {
  return (
    <section className="mx-5 mt-6 rounded-[32px] border border-[#2A241B] bg-[radial-gradient(circle_at_top,rgba(200,155,47,0.18),transparent_42%),linear-gradient(180deg,#15120E_0%,#0D0B09_100%)] px-6 py-10 text-[#F5E8CA] shadow-[0_24px_70px_rgba(0,0,0,0.34)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#C89B2F]">ShowTELA Ready</p>
      <h2 className="mt-4 text-[32px] font-semibold leading-[1.05] tracking-[-0.05em] text-[#FFF8EA]">
        The field is quiet.
      </h2>
      <p className="mt-4 max-w-[26rem] text-[14px] leading-relaxed text-[#D9CDB7]">
        Continuity will appear here once live operational notes, voice, or unresolved movement enter the runtime.
      </p>
      <div className="mt-8 rounded-[22px] border border-[#3A3126] bg-white/5 px-4 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#C8AF7A]">Operational State</p>
        <p className="mt-2 text-[13px] leading-relaxed text-[#E6D9C0]">
          No mock rails. No seeded continuity. The runtime is open and waiting for real movement.
        </p>
      </div>
    </section>
  )
}
