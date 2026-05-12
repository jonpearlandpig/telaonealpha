'use client'

import { motion } from 'framer-motion'
import type { SyncPayload } from '@/lib/notion'

type ContinueScreenProps = {
  syncData: SyncPayload | null
  syncing: boolean
}

function getInitials(name: string): string {
  return name
    .split(/[\s/&]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600000)
  const m = Math.floor(diff / 60000)
  if (h > 0) return `${h}h ago`
  if (m > 0) return `${m}m ago`
  return 'just now'
}

export default function ContinueScreen({ syncData, syncing }: ContinueScreenProps) {
  const acts = syncData?.conversionActs ?? []
  const primaryAct = acts[0] ?? null
  const recentActs = acts.slice(1)

  const STATUS_DOT_COLORS: Record<string, string> = {
    active: 'var(--live)',
    warm: 'var(--upcoming)',
    pending: 'var(--hold)',
    paused: 'var(--text-muted)',
  }

  return (
    <div style={{
      overflowY: 'auto',
      height: '100%',
      padding: '48px 20px 24px',
    }}>
      {/* Header */}
      <div>
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
          Operational Memory
        </div>
      </div>

      {/* CONTINUE section */}
      <div style={{ marginTop: 36 }}>
        <div style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 11,
          fontWeight: 400,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
        }}>
          Continue
        </div>
        <div style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 13,
          fontWeight: 300,
          color: 'var(--text-secondary)',
          marginTop: 4,
          marginBottom: 16,
        }}>
          Pick up where you left off.
        </div>

        {/* Active Thread Card */}
        {syncing && !primaryAct ? (
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-gold)',
            padding: 16,
            marginBottom: 16,
            opacity: 0.4,
          }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text-muted)' }}>
              Syncing…
            </div>
          </div>
        ) : primaryAct ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-gold)',
              padding: 16,
              marginBottom: 16,
              cursor: 'pointer',
            }}
          >
            {/* Top row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'var(--gold-dim)',
                border: '1px solid var(--gold-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: "'DM Mono', monospace",
                fontSize: 13,
                color: 'var(--gold-primary)',
                flexShrink: 0,
              }}>
                {getInitials(primaryAct.name)}
              </div>
              <div style={{ flex: 1 }}>
                <span style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 20,
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                }}>
                  {primaryAct.name}
                </span>
              </div>
              {primaryAct.status === 'active' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--live)',
                    display: 'inline-block',
                    animation: 'pulse-live 2s infinite',
                  }} />
                  <span style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 9,
                    color: 'var(--live)',
                    letterSpacing: '0.1em',
                  }}>
                    LIVE
                  </span>
                </div>
              )}
            </div>

            {/* Thread title */}
            {primaryAct.oneLineStatus && (
              <div style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 11,
                color: 'var(--gold-primary)',
                marginTop: 4,
                lineHeight: 1.4,
              }}>
                {primaryAct.oneLineStatus}
              </div>
            )}

            {/* Last active */}
            {syncData?.lastSynced && (
              <div style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 10,
                color: 'var(--text-muted)',
                marginTop: 6,
              }}>
                Last synced {timeAgo(syncData.lastSynced)}
              </div>
            )}

            {/* Next action */}
            {primaryAct.nextAction && (
              <div style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 12,
                fontWeight: 300,
                color: 'var(--text-secondary)',
                marginTop: 10,
                paddingLeft: 10,
                borderLeft: '2px solid var(--gold-border)',
              }}>
                {primaryAct.nextAction}
              </div>
            )}

            {/* Chevron */}
            <div style={{
              textAlign: 'right',
              color: 'var(--gold-primary)',
              fontSize: 18,
              marginTop: 10,
            }}>
              →
            </div>
          </motion.div>
        ) : (
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            padding: 16,
            marginBottom: 16,
          }}>
            <div style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 18,
              fontWeight: 300,
              color: 'var(--text-secondary)',
            }}>
              No active thread
            </div>
            <div style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 12,
              color: 'var(--text-muted)',
              marginTop: 6,
            }}>
              Sync Notion to load your current state.
            </div>
          </div>
        )}
      </div>

      {/* Recently Active */}
      {recentActs.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 11,
            fontWeight: 400,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            marginBottom: 8,
          }}>
            Recently Active
          </div>
          {recentActs.map((act, index) => (
            <motion.div
              key={act.name}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 0',
                borderBottom: '1px solid var(--border-subtle)',
                cursor: 'pointer',
              }}
            >
              {/* Type icon */}
              <div style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: 'var(--bg-raised)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: "'DM Mono', monospace",
                fontSize: 10,
                color: 'var(--text-muted)',
                flexShrink: 0,
              }}>
                {getInitials(act.name).slice(0, 1)}
              </div>

              {/* Name + subtitle */}
              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 14,
                  fontWeight: 400,
                  color: 'var(--text-primary)',
                }}>
                  {act.name}
                </div>
                {act.oneLineStatus && (
                  <div style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 12,
                    fontWeight: 300,
                    color: 'var(--text-secondary)',
                    marginTop: 1,
                  }}>
                    {act.oneLineStatus.slice(0, 60)}
                  </div>
                )}
              </div>

              {/* Status + chevron */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                <span style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: STATUS_DOT_COLORS[act.status] ?? 'var(--text-muted)',
                  display: 'inline-block',
                }} />
                <span style={{
                  color: 'var(--gold-border)',
                  fontSize: 14,
                }}>
                  →
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Action rows */}
      <div style={{ marginTop: 28 }}>
        {[
          {
            icon: '▶',
            label: 'RESUME THREAD',
            sub: 'Continue where you left off',
          },
          {
            icon: '⊞',
            label: 'VIEW LINKED MEMORY',
            sub: 'See related people, projects, notes',
          },
          {
            icon: '+',
            label: 'CREATE NEW MEMORY',
            sub: 'Capture something new',
          },
        ].map((row) => (
          <div
            key={row.label}
            style={{
              borderLeft: '2px solid var(--gold-primary)',
              padding: '14px 16px',
              background: 'var(--bg-raised)',
              marginBottom: 8,
              cursor: 'pointer',
            }}
          >
            <div style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
              fontWeight: 400,
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <span style={{ color: 'var(--gold-primary)' }}>{row.icon}</span>
              {row.label}
            </div>
            <div style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 11,
              color: 'var(--text-muted)',
              marginTop: 2,
              paddingLeft: 20,
            }}>
              {row.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom padding */}
      <div style={{ height: 32 }} />
    </div>
  )
}
