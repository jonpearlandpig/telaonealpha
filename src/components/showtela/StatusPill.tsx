export function StatusPill({ unresolved }: { unresolved: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em] ${unresolved ? 'bg-[#F6EEDB] text-[#A6741D]' : 'bg-[#E8F3EA] text-[#4F8B55]'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${unresolved ? 'bg-[#C89B2F]' : 'bg-[#4F8B55]'}`} />
      {unresolved ? 'UNRESOLVED' : 'RESOLVED'}
    </span>
  );
}
