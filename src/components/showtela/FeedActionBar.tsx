const actions = [
  ["✓", "Acknowledge", "acknowledge"],
  ["✎", "Add Note", "add-note"],
  ["↗", "Assign", "open-thread"],
  ["⌁", "Pin", "pin"],
] as const;

type ActionType = (typeof actions)[number][2];

export function FeedActionBar({ onAction }: { onAction: (action: ActionType) => void }) {
  return (
    <div className="flex items-center justify-between border-t border-black/5 pt-3 text-[#6E6A63]">
      {actions.map(([icon, label, action]) => (
        <button key={label} onClick={() => onAction(action)} className="flex items-center gap-1.5 text-[12px] leading-4 active:scale-[0.98]">
          <span>{icon}</span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}

export type { ActionType };
