'use client'

type PresenceState = 'idle' | 'scanning' | 'priority' | 'risk' | 'resolved'

const NODE_COLOR: Record<PresenceState, string> = {
  idle: '#C89B2F',
  scanning: '#D4A83A',
  priority: '#D4A83A',
  risk: '#EF4444',
  resolved: '#22C55E',
}

const RING_OPACITY: Record<PresenceState, number> = {
  idle: 0.18,
  scanning: 0.28,
  priority: 0.38,
  risk: 0.34,
  resolved: 0.26,
}

export function PresenceLogo({
  state = 'idle',
  size = 140,
}: {
  state?: PresenceState
  size?: number
}) {
  const cx = size / 2
  const color = NODE_COLOR[state]
  const ro = RING_OPACITY[state]

  return (
    <>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
        aria-label={`ShowTELA presence — ${state}`}
      >
        {/* Outer ring */}
        <circle
          cx={cx} cy={cx} r={cx * 0.88}
          stroke={color} strokeWidth="0.75"
          strokeOpacity={ro * 0.55}
          className="presence-ring-outer"
        />
        {/* Middle ring */}
        <circle
          cx={cx} cy={cx} r={cx * 0.64}
          stroke={color} strokeWidth="1"
          strokeOpacity={ro * 0.85}
          className="presence-ring-mid"
        />
        {/* Inner ring */}
        <circle
          cx={cx} cy={cx} r={cx * 0.38}
          stroke={color} strokeWidth="1.2"
          strokeOpacity={ro * 1.4}
        />
        {/* Inner fill */}
        <circle
          cx={cx} cy={cx} r={cx * 0.38}
          fill={color} fillOpacity={0.04}
        />
        {/* Center node — continuity heartbeat */}
        <circle
          cx={cx} cy={cx} r={cx * 0.092}
          fill={color} fillOpacity={0.88}
          className="presence-node"
        />
      </svg>
      <style jsx>{`
        .presence-ring-outer {
          animation: presenceRing 7s ease-in-out infinite;
        }
        .presence-ring-mid {
          animation: presenceRing 7s ease-in-out infinite;
          animation-delay: 1.1s;
        }
        .presence-node {
          animation: presenceNode 7s ease-in-out infinite;
          animation-delay: 2.2s;
        }
        @keyframes presenceRing {
          0%, 100% { opacity: 0.28; }
          50% { opacity: 1; }
        }
        @keyframes presenceNode {
          0%, 100% { opacity: 0.52; }
          50% { opacity: 1; }
        }
      `}</style>
    </>
  )
}
