export function PearlDropButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="mx-auto grid h-12 w-12 -translate-y-1 place-items-center rounded-full bg-[#C89B2F] text-lg text-white shadow-[0_8px_20px_rgba(200,155,47,0.35)]">
      +
    </button>
  );
}
