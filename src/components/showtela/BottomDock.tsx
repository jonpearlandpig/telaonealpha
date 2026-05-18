import { PearlDropButton } from './PearlDropButton'

export function BottomDock({ onPearlDrop }: { onPearlDrop?: () => void }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-[430px]">
      <div className="mx-4 mb-4 rounded-[28px] border border-white/60 bg-[rgba(248,246,242,0.90)] px-2 py-2 shadow-[0_-2px_24px_rgba(17,17,17,0.10)] backdrop-blur-[28px]">
        <div className="grid grid-cols-5 items-end gap-0">
          <button className="flex flex-col items-center gap-1 py-1">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M3 9l8-6 8 6v10a1 1 0 01-1 1H4a1 1 0 01-1-1V9z" stroke="#C89B2F" strokeWidth="1.5" strokeLinejoin="round" fill="rgba(200,155,47,0.12)"/>
              <path d="M8 19v-7h5v7" stroke="#C89B2F" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
            <span className="text-[10px] font-medium text-[#C89B2F]">Home</span>
          </button>
          <button className="flex flex-col items-center gap-1 py-1">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <rect x="3" y="5" width="16" height="3" rx="1.5" stroke="#8B847B" strokeWidth="1.5"/>
              <rect x="3" y="10" width="16" height="3" rx="1.5" stroke="#8B847B" strokeWidth="1.5"/>
              <rect x="3" y="15" width="10" height="3" rx="1.5" stroke="#8B847B" strokeWidth="1.5"/>
            </svg>
            <span className="text-[10px] font-medium text-[#6E6A63]">Feed</span>
          </button>
          <div className="flex justify-center">
            <PearlDropButton onClick={onPearlDrop} />
          </div>
          <button className="flex flex-col items-center gap-1 py-1">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle cx="11" cy="8" r="3.5" stroke="#8B847B" strokeWidth="1.5"/>
              <path d="M4 19c0-3.866 3.134-7 7-7h0c3.866 0 7 3.134 7 7" stroke="#8B847B" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span className="text-[10px] font-medium text-[#6E6A63]">People</span>
          </button>
          <button className="relative flex flex-col items-center gap-1 py-1">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle cx="5" cy="11" r="1.5" fill="#8B847B"/>
              <circle cx="11" cy="11" r="1.5" fill="#8B847B"/>
              <circle cx="17" cy="11" r="1.5" fill="#8B847B"/>
            </svg>
            <span className="absolute right-3 top-0.5 h-2 w-2 rounded-full border border-[#F8F6F2] bg-[#C89B2F]" />
            <span className="text-[10px] font-medium text-[#6E6A63]">More</span>
          </button>
        </div>
      </div>
    </nav>
  )
}
