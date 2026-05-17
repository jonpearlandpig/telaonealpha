export function ShowTelaHeader() {
  return (
    <header className="px-7 pb-5 pt-[62px]">
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#C89B2F]">Crusade Runtime</p>
          <h1 className="mt-[10px] text-[38px] font-semibold leading-[42px] tracking-[-1.2px] text-[#111111]">ShowTELA</h1>
          <p className="mt-2 text-[18px] leading-7 text-[#6E6A63]">Operational continuity, live.</p>
        </div>
        <div className="rounded-2xl border border-black/5 bg-white/70 px-3 py-2 text-right shadow-[0_6px_18px_rgba(17,17,17,0.04)] backdrop-blur-md">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#8B847B]">Status</p>
          <p className="text-[13px] font-medium text-[#111111]">72°F • Hershey</p>
        </div>
      </div>
    </header>
  );
}
