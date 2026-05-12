'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

type PearlItem = {
  id: string
  content: string
  source: string
  createdAt: string
}

type MoreScreenProps = {
  pearlItems: PearlItem[]
  onCapturePearl: (content: string) => Promise<void>
  onRefreshPearl: () => void
  pearlLoading: boolean
  onSync: () => void
  syncing: boolean
  lastSynced?: string
}

function formatSyncLabel(iso: string): string {
  const d = new Date(iso)
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const day = days[d.getDay()]
  const hrs = d.getHours()
  const min = d.getMinutes().toString().padStart(2, '0')
  const ampm = hrs >= 12 ? 'PM' : 'AM'
  const h = hrs % 12 || 12
  const mo = d.getMonth() + 1
  const dt = d.getDate()
  const yr = String(d.getFullYear()).slice(2)
  return `${day} ${h}:${min} ${ampm} ${mo}/${dt}/${yr}`
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: "'DM Sans', sans-serif",
      fontSize: 9,
      fontWeight: 400,
      letterSpacing: '0.18em',
      textTransform: 'uppercase' as const,
      color: 'var(--text-muted)',
      marginBottom: 12,
      marginTop: 32,
    }}>
      {children}
    </div>
  )
}

export default function MoreScreen({
  pearlItems,
  onCapturePearl,
  onRefreshPearl,
  pearlLoading,
  onSync,
  syncing,
  lastSynced,
}: MoreScreenProps) {
  const [pearlInput, setPearlInput] = useState('')
  const [capturing, setCapturing] = useState(false)
  const [captured, setCaptured] = useState(false)

  async function handleCapture() {
    if (!pearlInput.trim()) return
    setCapturing(true)
    try {
      await onCapturePearl(pearlInput.trim())
      setPearlInput('')
      setCaptured(true)
      setTimeout(() => setCaptured(false), 2000)
    } finally {
      setCapturing(false)
    }
  }

  return (
    <div style={{
      overflowY: 'auto',
      height: '100%',
      padding: '48px 20px 24px',
    }}>
      <div style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: 28,
        fontWeight: 300,
        color: 'var(--gold-primary)',
      }}>
        TELAdex
      </div>
      <div style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: 9,
        letterSpacing: '0.2em',
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        marginTop: 2,
      }}>
        System &amp; Settings
      </div>

      <SectionLabel>System Status</SectionLabel>
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        padding: '14px 16px',
      }}>
        {([
          { label: 'Notion', status: 'connected', color: 'var(--live)' },
          { label: 'Anthropic', status: 'connected', color: 'var(--live)' },
          { label: 'Stack', status: 'live', color: 'var(--live)' },
        ] as const).map((item) => (
          <div
            key={item.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 0',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <span style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
              fontWeight: 400,
              color: 'var(--text-primary)',
            }}>
              {item.label}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: item.color,
                display: 'inline-block',
              }} />
              <span style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 10,
                color: item.color,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}>
                {item.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      <SectionLabel>Pearl Box</SectionLabel>
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        padding: '16px',
      }}>
        <div style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 12,
          fontWeight: 300,
          color: 'var(--text-secondary)',
          marginBottom: 12,
          lineHeight: 1.5,
        }}>
          Capture a thought, link, or idea. It goes to your Pearl Box inbox in Notion.
        </div>

        <textarea
          value={pearlInput}
          onChange={(e) => setPearlInput(e.target.value)}
          placeholder="What's worth capturing?"
          rows={3}
          style={{
            width: '100%',
            background: 'var(--bg-raised)',
            border: '1px solid var(--border-mid)',
            borderRadius: 2,
            padding: '10px 12px',
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 14,
            fontWeight: 300,
            color: 'var(--text-primary)',
            resize: 'none',
            outline: 'none',
            marginBottom: 10,
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--gold-border)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-mid)'
          }}
        />

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={handleCapture}
            disabled={capturing || !pearlInput.trim()}
            style={{
              background: captured ? 'var(--live-dim)' : 'var(--gold-dim)',
              border: '1px solid ' + (captured ? 'var(--live)' : 'var(--gold-border)'),
              color: captured ? 'var(--live)' : 'var(--gold-primary)',
              fontFamily: "'DM Mono', monospace",
              fontSize: 11,
              letterSpacing: '0.15em',
              padding: '8px 16px',
              cursor: capturing || !pearlInput.trim() ? 'not-allowed' : 'pointer',
              opacity: capturing || !pearlInput.trim() ? 0.5 : 1,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {captured ? 'CAPTURED' : capturing ? 'CAPTURING' : 'CAPTURE'}
          </button>
          <button
            onClick={onRefreshPearl}
            disabled={pearlLoading}
            style={{
              background: 'none',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
              fontFamily: "'DM Mono', monospace",
              fontSize: 10,
              padding: '8px 12px',
              cursor: pearlLoading ? 'not-allowed' : 'pointer',
              opacity: pearlLoading ? 0.5 : 1,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {pearlLoading ? 'LOADING' : 'REFRESH'}
          </button>
        </div>

        {pearlItems.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 9,
              color: 'var(--text-muted)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: 8,
            }}>
              Recent ({pearlItems.length})
            </div>
            {pearlItems.slice(0, 5).map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                style={{
                  padding: '8px 0',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 12,
                  fontWeight: 300,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.4,
                }}>
                  {item.content.slice(0, 120)}{item.content.length > 120 ? '...' : ''}
                </div>
                <div style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 9,
                  color: 'var(--text-muted)',
                  marginTop: 4,
                }}>
                  {item.source} - {new Date(item.createdAt).toLocaleDateString()}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <SectionLabel>Sync</SectionLabel>
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        padding: '16px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 14,
              fontWeight: 400,
              color: 'var(--text-primary)',
            }}>
              Sync Notion
            </div>
            {lastSynced && (
              <div style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 10,
                color: 'var(--text-muted)',
                marginTop: 2,
              }}>
                Last: {formatSyncLabel(lastSynced)}
              </div>
            )}
          </div>
          <button
            onClick={onSync}
            disabled={syncing}
            style={{
              background: 'var(--bg-raised)',
              border: '1px solid var(--border-gold)',
              color: syncing ? 'var(--text-muted)' : 'var(--gold-primary)',
              fontFamily: "'DM Mono', monospace",
              fontSize: 11,
              letterSpacing: '0.12em',
              padding: '8px 14px',
              cursor: syncing ? 'not-allowed' : 'pointer',
              opacity: syncing ? 0.6 : 1,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {syncing ? 'SYNCING' : 'SYNC'}
          </button>
        </div>
      </div>

      <SectionLabel>About</SectionLabel>
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        padding: '16px',
      }}>
        <div style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 18,
          fontWeight: 300,
          color: 'var(--text-primary)',
          marginBottom: 4,
        }}>
          TELAdex Alpha
        </div>
        <div style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 10,
          color: 'var(--text-muted)',
          lineHeight: 1.6,
        }}>
          Pearl &amp; Pig - Version 0.1
          <br />
          Sovereign Operational Cognition Runtime
        </div>
      </div>

      <div style={{ height: 32 }} />
    </div>
  )
}
