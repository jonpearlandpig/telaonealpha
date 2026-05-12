'use client'

type Status = 'active' | 'warm' | 'pending' | 'paused'

const STATUS_COLORS: Record<Status, string> = {
  active:  '#ef4444',
  warm:    '#C4973A',
  pending: 'rgba(234,224,210,0.3)',
  paused:  'rgba(234,224,210,0.15)',
}

export function StatusDot({ status, size = 8 }: { status: Status; size?: number }) {
  const color = STATUS_COLORS[status]
  const isActive = status === 'active'

  return (
    <span
      className={isActive ? 'pulse-red' : ''}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: color,
        flexShrink: 0,
      }}
    />
  )
}
