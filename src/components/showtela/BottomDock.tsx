import { PearlDropButton } from './PearlDropButton';

export function BottomDock({ onPearlDrop }: { onPearlDrop?: () => void }) {
  return (
    <nav className="fixed bottom-4 left-1/2 z-50 h-[86px] w-[min(94vw,430px)] -translate-x-1/2 rounded-[34px] border border-white/50 bg-[rgba(255,255,255,0.78)] px-4 py-3 shadow-[0_16px_34px_rgba(17,17,17,0.12)] backdrop-blur-[24px]">
      <div className="grid grid-cols-5 items-center text-center text-[11px] text-[#6E6A63]">
        <button className="font-medium text-[#111111]">Feed</button>
        <button>Search</button>
        <PearlDropButton onClick={onPearlDrop} />
        <button>Live</button>
        <button>Memory</button>
      </div>
    </nav>
  );
}
