'use client'

import { motion } from 'framer-motion'
import type { RolodexCardProps } from './RolodexCard'

type CardDetailProps = {
  card: RolodexCardProps
  onClose: () => void
}

function getInitials(title: string): string {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

function getStatusBadgeStyle(status: RolodexCardProps['status']): React.CSSProperties {
  switch (status) {
    case 'live':
      return { background: 'var(--live-dim)', color: 'var(--live)' }
    case 'attention':
      return { background: 'var(--attention-dim)', color: 'var(--attention)' }
    case 'upcoming':
      return { background: 'var(--gold-dim)', color: 'var(--upcoming)' }
    case 'hold':
      return { background: 'rgba(234,224,210,0.06)', color: 'var(--text-muted)' }
  }
}

export function CardDetail({ card, onClose }: CardDetailProps) {
  const initials = getInitials(card.title)
  const badgeStyle = getStatusBadgeStyle(card.status)

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      style={{ overflow: 'hidden' }}
    >
      <div
        style={{
          background: 'var(--bg-raised)',
          border: '1px solid var(--border-gold)',
          padding: 20,
          marginBottom: 8,
        }}
      >
        {/* Gold connector */}
        <div
          style={{
            borderTop: '2px solid var(--gold-primary)',
            width: 40,
            margin: '0 auto 16px',
          }}
        />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'var(--gold-dim)',
              border: '1px solid var(--gold-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: "'DM Mono', monospace",
              fontSize: 15,
              color: 'var(--gold-primary)',
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 24,
                fontWeight: 500,
                color: 'var(--text-primary)',
                lineHeight: 1.1,
                marginBottom: 4,
              }}
            >
              {card.title}
            </div>
            <div
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 10,
                color: 'var(--text-muted)',
                marginBottom: 6,
              }}
            >
              {card.tid}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span
                style={{
                  ...badgeStyle,
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 9,
                  padding: '2px 8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                {card.statusLabel}
              </span>
              <span
                style={{
                  background: 'var(--bg-card)',
                  color: 'var(--text-muted)',
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 9,
                  padding: '2px 8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {card.systemLabel}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: '1px solid var(--border-mid)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: "'DM Mono', monospace",
              fontSize: 14,
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        {/* Two-column data */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            {card.leftCol.map((item, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 9,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: 'var(--text-muted)',
                    marginBottom: 2,
                  }}
                >
                  {item.label}
                </div>
                <div
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13,
                    fontWeight: 300,
                    color: 'var(--text-primary)',
                    lineHeight: 1.4,
                  }}
                >
                  {item.value}
                </div>
              </div>
            ))}
          </div>
          <div>
            {card.rightCol.map((item, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 9,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: 'var(--text-muted)',
                    marginBottom: 2,
                  }}
                >
                  {item.label}
                </div>
                <div
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13,
                    fontWeight: 300,
                    color: 'var(--text-primary)',
                    lineHeight: 1.4,
                  }}
                >
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Next Step */}
        <div
          style={{
            borderLeft: '2px solid var(--gold-primary)',
            background: 'var(--gold-glow)',
            padding: '12px 14px',
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 9,
              color: 'var(--gold-primary)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: 6,
            }}
          >
            NEXT STEP
          </div>
          <div
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
              fontWeight: 300,
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
            }}
          >
            Continue thread. Review context and determine next action.
          </div>
        </div>

        {/* Quick Actions */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
          }}
        >
          {[
            `Message ${card.title.split(' ')[0]}`,
            'Open Thread',
            'View Notes',
            'Add Note',
          ].map((label) => (
            <button
              key={label}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-mid)',
                color: 'var(--text-secondary)',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 12,
                fontWeight: 400,
                padding: '10px 12px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'border-color 0.15s, color 0.15s',
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-gold)'
                ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-mid)'
                ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
