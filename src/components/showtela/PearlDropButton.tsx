export function PearlDropButton({ onClick }: { onClick?: () => void }) {
  return (
    <button onClick={onClick} className="mx-auto grid h-14 w-14 -translate-y-2 place-items-center rounded-full bg-[#C89B2F] text-xl text-white shadow-[0_12px_28px_rgba(200,155,47,0.45)]">
      +
    </button>
  );
}
