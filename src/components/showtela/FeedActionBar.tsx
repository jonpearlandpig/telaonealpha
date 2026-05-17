const actions = [
  ["✓", "Acknowledge"],
  ["✎", "Add Note"],
  ["↗", "Assign"],
  ["⌁", "Pin"],
] as const;

export type ActionType = "acknowledge" | "note" | "assign" | "pin";

export function FeedActionBar() {
  return (
    <div className="flex items-center justify-between border-t border-black/5 pt-3 text-[#6E6A63]">
      {actions.map(([icon, label]) => (
        <button key={label} className="flex items-center gap-1.5 text-[12px] leading-4 active:scale-[0.98]">
          <span>{icon}</span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
