'use client'
import { useState } from 'react'

type Tab = 'home' | 'play' | 'messages' | 'calendar' | 'profile'

export function BottomDock({ activeTab, onTabChange, userImage, userName, onPearlDrop }: { activeTab?: Tab; onTabChange?: (tab: Tab) => void; userImage?: string; userName?: string; onPearlDrop?: () => void }) {
  const [tab, setTab] = useState<Tab>(activeTab ?? 'home')

  const handleTab = (t: Tab) => {
    setTab(t)
    onTabChange?.(t)
  }

  const gold = '#C89B2F'
  const muted = '#8B847B'

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-[430px]">
      <div className="mx-3 mb-4 rounded-[28px] border border-white/60 bg-[rgba(248,246,242,0.94)] px-4 py-2 shadow-[0_-2px_24px_rgba(17,17,17,0.10)] backdrop-blur-[28px]">
        <div className="flex items-end justify-between">
          <button onClick={() => handleTab('home')} className="flex flex-col items-center gap-1 py-1 min-w-[52px]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3 10.5L12 3l9 7.5V21a1 1 0 01-1 1H5a1 1 0 01-1-1V10.5z" stroke={tab === 'home' ? gold : muted} strokeWidth="1.6" strokeLinejoin="round" fill={tab === 'home' ? `${gold}18` : 'none'}/>
              <path d="M9 21v-8h6v8" stroke={tab === 'home' ? gold : muted} strokeWidth="1.6" strokeLinejoin="round"/>
            </svg>
            <span className="text-[10px] font-medium" style={{ color: tab === 'home' ? gold : muted }}>Home</span>
          </button>

          <button onClick={() => handleTab('play')} className="flex flex-col items-center gap-1 py-1 min-w-[52px]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="5" stroke={tab === 'play' ? gold : muted} strokeWidth="1.6" fill={tab === 'play' ? `${gold}18` : 'none'}/>
              <path d="M9.5 8.5l7 3.5-7 3.5V8.5z" fill={tab === 'play' ? gold : muted}/>
            </svg>
            <span className="text-[10px] font-medium" style={{ color: tab === 'play' ? gold : muted }}>Play</span>
          </button>

          <button onClick={() => handleTab('messages')} className="flex flex-col items-center gap-1 py-1 min-w-[52px] relative">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke={tab === 'messages' ? gold : muted} strokeWidth="1.6" strokeLinejoin="round" fill={tab === 'messages' ? `${gold}18` : 'none'}/>
            </svg>
            <span className="absolute right-2 top-0.5 h-2 w-2 rounded-full border border-[#F8F6F2] bg-[#F87171]" />
            <span className="text-[10px] font-medium" style={{ color: tab === 'messages' ? gold : muted }}>Messages</span>
          </button>

          <button onClick={() => handleTab('calendar')} className="flex flex-col items-center gap-1 py-1 min-w-[52px]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="17" rx="3" stroke={tab === 'calendar' ? gold : muted} strokeWidth="1.6" fill={tab === 'calendar' ? `${gold}18` : 'none'}/>
              <path d="M3 9h18" stroke={tab === 'calendar' ? gold : muted} strokeWidth="1.6"/>
              <path d="M8 2v3M16 2v3" stroke={tab === 'calendar' ? gold : muted} strokeWidth="1.6" strokeLinecap="round"/>
              <rect x="7" y="13" width="3" height="3" rx="0.5" fill={tab === 'calendar' ? gold : muted}/>
              <rect x="13" y="13" width="3" height="3" rx="0.5" fill={tab === 'calendar' ? `${gold}60` : `${muted}60`}/>
            </svg>
            <span className="text-[10px] font-medium" style={{ color: tab === 'calendar' ? gold : muted }}>Calendar</span>
          </button>

          <button onClick={() => handleTab('profile')} className="flex flex-col items-center gap-1 py-1 min-w-[52px] relative">
            <div className="h-7 w-7 overflow-hidden rounded-full border-[2px]" style={{ borderColor: tab === 'profile' ? gold : 'transparent' }}>
              {userImage
                ? <img src={userImage} alt={userName ?? 'Profile'} className="h-full w-full object-cover" />
                : <div className="flex h-full w-full items-center justify-center bg-[#1A1712] text-[11px] font-semibold text-[#F8E1B0]">{userName?.slice(0,1) ?? 'J'}</div>
              }
            </div>
            <span className="absolute right-2 top-0 h-2.5 w-2.5 rounded-full border-[1.5px] border-[#F8F6F2] bg-[#C89B2F]" />
            <span className="text-[10px] font-medium" style={{ color: tab === 'profile' ? gold : muted }}>Profile</span>
          </button>
        </div>
      </div>
    </nav>
  )
}
