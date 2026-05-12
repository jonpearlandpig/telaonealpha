'use client'

import { useEffect, useState } from 'react'

type Props = {
  lastSynced?: string
  onSync: () => void
  syncing: boolean
  activeView: 'continuity' | 'chat' | 'hho'
  onViewChange: (v: 'continuity' | 'chat' | 'hho') => void
}

function LiveClock() {
  const [time, setTime] = useState('')

  useEffect(() => {
    function tick() {
      const now = new Date()
      const hrs = now.getHours()
      const min = now.getMinutes().toString().padStart(2, '0')
      const ampm = hrs >= 12 ? 'P' : 'A'
      const h = hrs % 12 || 12
      setTime(`${h}:${min}${ampm}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: 'rgba(234,224,210,0.4)', letterSpacing: '0.05em' }}>
      {time}
    </span>
  )
}

function formatSyncTime(iso: string): string {
  const d = new Date(iso)
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const day = days[d.getDay()]
  const hrs = d.getHours()
  const min = d.getMinutes().toString().padStart(2, '0')
  const ampm = hrs >= 12 ? 'P' : 'A'
  const h = hrs % 12 || 12
  const mo = (d.getMonth() + 1)
  const dt = d.getDate()
  const yr = String(d.getFullYear()).slice(2)
  return `${day} ${h}:${min}${ampm} ${mo}/${dt}/${yr}`
}

export function TopNav({ lastSynced, onSync, syncing, activeView, onViewChange }: Props) {
  return (
    <header style={{
      borderBottom: '1px solid rgba(234,224,210,0.08)',
      background: '#0D1B2A',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      padding: '0 24px',
    }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <span style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 22,
            fontWeight: 400,
            color: '#C4973A',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
          }}>
            TELA
          </span>

          {/* Nav */}
          <nav style={{ display: 'flex', gap: 2 }}>
            {(['continuity', 'chat', 'hho'] as const).map((view) => {
              const labels = { continuity: 'Operations', chat: 'TELA', hho: 'HHOs' }
              const isActive = activeView === view
              return (
                <button
                  key={view}
                  onClick={() => onViewChange(view)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '6px 14px',
                    fontSize: 12,
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: isActive ? 500 : 300,
                    color: isActive ? '#EAE0D2' : 'rgba(234,224,210,0.4)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    borderBottom: isActive ? '1px solid #C4973A' : '1px solid transparent',
                    transition: 'color 0.15s, border-color 0.15s',
                  }}
                >
                  {labels[view]}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Right: clock + sync */}
        <div className="nav-right" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <LiveClock />

          {lastSynced && (
            <span className="nav-sync-label" style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'rgba(234,224,210,0.25)' }}>
              Synced {formatSyncTime(lastSynced)}
            </span>
          )}

          <button
            onClick={onSync}
            disabled={syncing}
            style={{
              background: 'none',
              border: '1px solid rgba(196,151,58,0.3)',
              color: syncing ? 'rgba(196,151,58,0.4)' : '#C4973A',
              cursor: syncing ? 'default' : 'pointer',
              padding: '5px 14px',
              fontSize: 11,
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 400,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              transition: 'border-color 0.2s, color 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!syncing) (e.target as HTMLButtonElement).style.borderColor = 'rgba(196,151,58,0.7)'
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.borderColor = 'rgba(196,151,58,0.3)'
            }}
          >
            {syncing ? 'Syncing…' : 'Sync'}
          </button>
        </div>
      </div>
    </header>
  )
}
