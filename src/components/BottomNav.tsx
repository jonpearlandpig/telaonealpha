'use client'

type Tab = 'continue' | 'browse' | 'voice' | 'today' | 'more'

type BottomNavProps = {
  activeTab: string
  onTabChange: (tab: Tab) => void
}

const TABS: { id: Tab; label: string; symbol: string }[] = [
  { id: 'continue', label: 'CONTINUE', symbol: '↺' },
  { id: 'browse',   label: 'BROWSE',   symbol: '◎' },
  { id: 'voice',    label: 'VOICE',    symbol: '◉' },
  { id: 'today',    label: 'TODAY',    symbol: '◈' },
  { id: 'more',     label: 'MORE',     symbol: '⋯' },
]

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav
      style={{
        height: 'calc(64px + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        flexShrink: 0,
      }}
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: isActive ? 'var(--gold-primary)' : 'var(--text-muted)',
              padding: 0,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 14,
                lineHeight: 1,
                color: isActive ? 'var(--gold-primary)' : 'var(--text-muted)',
              }}
            >
              {tab.symbol}
            </span>
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 9,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: isActive ? 'var(--gold-primary)' : 'var(--text-muted)',
                lineHeight: 1,
              }}
            >
              {tab.label}
            </span>
            {isActive && (
              <span
                style={{
                  width: 3,
                  height: 3,
                  borderRadius: '50%',
                  background: 'var(--gold-primary)',
                  display: 'block',
                }}
              />
            )}
          </button>
        )
      })}
    </nav>
  )
}
