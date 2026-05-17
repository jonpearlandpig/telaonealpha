export function ShowTelaHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white/70 px-5 pb-3 pt-6 shadow-[0_2px_8px_rgba(17,17,17,0.02)] backdrop-blur-lg">
      <div className="flex min-h-[56px] items-end justify-between">
        <div>
          <h1 className="text-[32px] font-semibold leading-none tracking-[-0.4px]">ShowTELA</h1>
          <p className="mt-1 text-[12px] leading-4 text-[#9A948B]">Crusade Operational Continuity</p>
        </div>
        <div className="flex gap-2">
          {["🔔", "⌕", "✉"].map((icon) => (
            <button key={icon} className="h-11 w-11 rounded-full border border-black/5 bg-white/70 text-[15px] text-[#6E6A63] backdrop-blur-lg active:scale-[0.97]">
              {icon}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
