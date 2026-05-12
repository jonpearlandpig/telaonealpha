'use client'

import { motion } from 'framer-motion'
import type { SyncPayload } from '@/lib/notion'

type Props = {
  syncData: SyncPayload | null
  syncing: boolean
}

function formatDate(): string {
  const d = new Date()
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`
}

export default function TodayScreen({ syncData, syncing }: Props) {
  const alsoInMotion = syncData?.alsoInMotion ?? []
  const conversionActs = syncData?.conversionActs ?? []
  const activeActs = conversionActs.filter((a) => a.status === 'active')

  return (
    <div style={{ overflowY: 'auto', height: '100%', padding: '48px 20px 24px' }}>
      {/* Date header */}
      <div style={{ marginBottom: 32 }}>
        <div
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 9,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.16em',
            marginBottom: 4,
          }}
        >
          Today
        </div>
        <div
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 26,
            fontWeight: 300,
            color: 'var(--text-primary)',
            lineHeight: 1.1,
          }}
        >
          {formatDate()}
        </div>
      </div>

      {/* Active now */}
      {activeActs.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 9,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.16em',
              marginBottom: 12,
            }}
          >
            Active Now
          </div>
          {activeActs.map((act, i) => (
            <motion.div
              key={act.name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--live-dim)',
                padding: '14px 16px',
                marginBottom: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--live)',
                  flexShrink: 0,
                  animation: 'pulse-live 2s infinite',
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: 17,
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    lineHeight: 1.2,
                  }}
                >
                  {act.name}
                </div>
                {act.nextAction && (
                  <div
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 12,
                      fontWeight: 300,
                      color: 'var(--text-secondary)',
                      marginTop: 2,
                      lineHeight: 1.4,
                    }}
                  >
                    {act.nextAction}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Also in motion */}
      {alsoInMotion.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 9,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.16em',
              marginBottom: 12,
            }}
          >
            Also in Motion
          </div>
          {alsoInMotion.map((item, i) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.04 }}
              style={{
                borderBottom: '1px solid var(--border-subtle)',
                padding: '12px 0',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: 'var(--bg-raised)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 10,
                  color: 'var(--text-muted)',
                  flexShrink: 0,
                }}
              >
                {item.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 14,
                    fontWeight: 400,
                    color: 'var(--text-primary)',
                    marginBottom: 2,
                  }}
                >
                  {item.name}
                </div>
                <div
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 12,
                    fontWeight: 300,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.4,
                  }}
                >
                  {item.note}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* No data state */}
      {!syncing && activeActs.length === 0 && alsoInMotion.length === 0 && (
        <div
          style={{
            paddingTop: '8vh',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 36,
              fontWeight: 300,
              color: 'var(--gold-primary)',
              opacity: 0.4,
              marginBottom: 12,
            }}
          >
            TELA
          </div>
          <div
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
              fontWeight: 300,
              color: 'var(--text-muted)',
            }}
          >
            Sync to load today's context.
          </div>
        </div>
      )}

      {syncing && (
        <div
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 11,
            color: 'var(--text-muted)',
            textAlign: 'center',
            paddingTop: '8vh',
            letterSpacing: '0.1em',
          }}
        >
          Syncing…
        </div>
      )}

      <div style={{ height: 32 }} />
    </div>
  )
}
