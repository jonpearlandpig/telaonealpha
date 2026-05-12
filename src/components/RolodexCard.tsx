'use client'

import { motion } from 'framer-motion'

export type RolodexCardProps = {
  id: string
  systemLabel: string
  tid: string
  title: string
  statusLabel: string
  status: 'live' | 'attention' | 'upcoming' | 'hold'
  leftCol: { label: string; value: string }[]
  rightCol: { label: string; value: string }[]
  isSelected?: boolean
  onTap?: () => void
}

function getStatusColor(status: RolodexCardProps['status']): string {
  switch (status) {
    case 'live':      return 'var(--live)'
    case 'attention': return 'var(--attention)'
    case 'upcoming':  return 'var(--upcoming)'
    case 'hold':      return 'var(--hold)'
  }
}

function getStatusAnimation(status: RolodexCardProps['status']): string | undefined {
  switch (status) {
    case 'live':      return 'pulse-live 2s infinite'
    case 'attention': return 'pulse-attention 1.5s infinite'
    default:          return undefined
  }
}

function getInitials(title: string): string {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

export function RolodexCard({
  systemLabel,
  tid,
  title,
  statusLabel,
  status,
  leftCol,
  rightCol,
  isSelected,
  onTap,
}: RolodexCardProps) {
  const now = new Date()
  const dateStr = `${now.getMonth() + 1}/${now.getDate()}/${String(now.getFullYear()).slice(2)}`
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })

  return (
    <motion.div
      whileTap={{ scale: 0.99 }}
      onClick={onTap}
      style={{
        background: 'var(--card-cream)',
        borderRadius: 2,
        padding: '16px 18px',
        minHeight: 160,
        position: 'relative',
        cursor: 'pointer',
        boxShadow: '2px 2px 0 #C8B99A, 4px 4px 0 #B8A88A, 6px 6px 0 #A8987A',
        marginBottom: 8,
        borderBottom: isSelected ? '2px solid var(--gold-primary)' : 'none',
        userSelect: 'none',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <span
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 9,
            color: '#8A7A62',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          {systemLabel}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 9,
              color: '#8A7A62',
              textTransform: 'uppercase',
            }}
          >
            {tid}
          </span>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: getStatusColor(status),
              display: 'inline-block',
              animation: getStatusAnimation(status),
              flexShrink: 0,
            }}
          />
        </div>
      </div>

      {/* Title + status label */}
      <div style={{ marginBottom: 10 }}>
        <div
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 22,
            fontWeight: 500,
            color: 'var(--text-on-card)',
            lineHeight: 1.1,
            marginBottom: 2,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 14,
            fontStyle: 'italic',
            color: 'var(--gold-primary)',
          }}
        >
          {statusLabel}
        </div>
      </div>

      {/* Divider */}
      <div
        style={{
          borderTop: '1px solid #C8B99A',
          marginBottom: 10,
        }}
      />

      {/* Two-column data */}
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1 }}>
          {leftCol.map((item, i) => (
            <div key={i} style={{ marginBottom: 6 }}>
              <div
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 8,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: '#8A7A62',
                  marginBottom: 1,
                }}
              >
                {item.label}
              </div>
              <div
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 12,
                  fontWeight: 300,
                  color: 'var(--text-on-card)',
                  lineHeight: 1.3,
                }}
              >
                {item.value}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            width: 1,
            background: '#C8B99A',
            flexShrink: 0,
          }}
        />

        <div style={{ flex: 1 }}>
          {rightCol.map((item, i) => (
            <div key={i} style={{ marginBottom: 6 }}>
              <div
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 8,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: '#8A7A62',
                  marginBottom: 1,
                }}
              >
                {item.label}
              </div>
              <div
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 12,
                  fontWeight: 300,
                  color: 'var(--text-on-card)',
                  lineHeight: 1.3,
                }}
              >
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: 10,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 8,
            color: '#A09080',
          }}
        >
          {`Retrieved: ${dateStr} · ${timeStr}`}
        </span>
        <span
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 8,
            color: '#A09080',
          }}
        >
          TELA ⊞
        </span>
      </div>

      {/* Hidden initials for avatar reuse — used by parent as data-initials */}
      <span style={{ display: 'none' }}>{getInitials(title)}</span>
    </motion.div>
  )
}
