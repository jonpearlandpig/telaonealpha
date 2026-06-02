'use client';

/**
 * TELACard.tsx — ShowTELA Reference Component
 *
 * THIS FILE IS THE DESIGN REFERENCE.
 * When Claude Code builds any new component, it must pattern-match
 * from this file for tokens, structure, motion, and aesthetic decisions.
 *
 * Three component variants are exported:
 *   1. TELAHeroCard      — full-bleed image card with status, title, metadata
 *   2. TELAUpdateItem    — activity/update list row with status dot
 *   3. TELANextAction    — CTA card with gold progress and arrow button
 *
 * Stack: Next.js 15 · TypeScript · Tailwind CSS v4 · Framer Motion
 */

import { motion } from 'framer-motion';

// ─── Animation Presets ───────────────────────────────────────────────────────

const fadeUp = {
  hidden:  { opacity: 0, y: 12 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1], delay },
  }),
};

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusType = 'live' | 'ready' | 'pending' | 'attention' | 'complete';
type DotColor   = 'green' | 'amber' | 'red' | 'blue' | 'purple';

interface HeroCardProps {
  status:      StatusType;
  statusLabel: string;
  title:       string;
  subtitle?:   string;
  location?:   string;
  milestone?:  string;
  imageUrl:    string;
  delay?:      number;
}

interface UpdateItemProps {
  icon:      React.ReactNode;
  text:      string;
  time:      string;
  dotColor:  DotColor;
  delay?:    number;
}

interface NextActionProps {
  label:    string;
  action:   string;
  progress: number; // 0–100
  onPress?: () => void;
  delay?:   number;
}

// ─── Color Map ────────────────────────────────────────────────────────────────

const dotColorMap: Record<DotColor, string> = {
  green:  'var(--color-status-green)',
  amber:  'var(--color-status-amber)',
  red:    'var(--color-status-red)',
  blue:   'var(--color-status-blue)',
  purple: 'var(--color-status-purple)',
};

const statusBadgeStyle: Record<StatusType, React.CSSProperties> = {
  live:      { background: 'var(--color-status-live)', color: '#fff' },
  ready:     { background: 'var(--color-status-green-bg)', color: 'var(--color-status-green)' },
  pending:   { background: 'var(--color-status-amber-bg)', color: 'var(--color-status-amber)' },
  attention: { background: 'var(--color-status-red-bg)', color: 'var(--color-status-red)' },
  complete:  { background: 'var(--color-status-green-bg)', color: 'var(--color-status-green)' },
};

// ─── TELAHeroCard ─────────────────────────────────────────────────────────────

/**
 * Full-bleed hero card — used for active project / show status.
 * Image fills the card; gradient overlays from bottom.
 * Title uses Playfair Display for cinematic presence.
 */
export function TELAHeroCard({
  status,
  statusLabel,
  title,
  subtitle,
  location,
  milestone,
  imageUrl,
  delay = 0,
}: HeroCardProps) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      custom={delay}
      style={{
        position: 'relative',
        borderRadius: 'var(--radius-card-lg)',
        overflow: 'hidden',
        minHeight: 240,
        border: '1px solid var(--color-navy-border)',
      }}
    >
      {/* Background image */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${imageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
        }}
      />

      {/* Gradient overlay — always applied over image */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'var(--gradient-hero)',
        }}
      />

      {/* Content */}
      <div
        style={{
          position: 'relative',
          padding: 'var(--space-card)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-3)',
          minHeight: 240,
          justifyContent: 'flex-end',
        }}
      >
        {/* Status badge — top left */}
        <div style={{ position: 'absolute', top: 'var(--space-card)', left: 'var(--space-card)' }}>
          <span
            className="tela-badge"
            style={statusBadgeStyle[status]}
          >
            {statusLabel}
          </span>
        </div>

        {/* Title block */}
        <div>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(22px, 6vw, 28px)',
              fontWeight: 'var(--weight-bold)',
              color: 'var(--color-white)',
              letterSpacing: '-0.01em',
              lineHeight: 1.15,
              margin: 0,
            }}
          >
            {title}
          </h2>
          {subtitle && (
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 18,
                fontStyle: 'italic',
                color: 'var(--color-gold)',
                margin: '4px 0 0',
                fontWeight: 400,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>

        {/* Metadata row */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {location && (
            <MetaRow icon="📍" text={location} />
          )}
          {milestone && (
            <MetaRow icon="⏱" text={milestone} />
          )}
        </div>
      </div>
    </motion.div>
  );
}

function MetaRow({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 12, opacity: 0.7 }}>{icon}</span>
      <span
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-small)',
          color: 'var(--color-cream)',
          opacity: 0.85,
        }}
      >
        {text}
      </span>
    </div>
  );
}

// ─── TELAUpdateItem ───────────────────────────────────────────────────────────

/**
 * Activity / update row — used in "Since You Were Last Here" sections.
 * Icon + text + timestamp on left; colored status dot on right.
 * Tap target always ≥ 44px height.
 */
export function TELAUpdateItem({
  icon,
  text,
  time,
  dotColor,
  delay = 0,
}: UpdateItemProps) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      custom={delay}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        minHeight: 'var(--touch-min)',
        paddingBlock: 'var(--space-2)',
      }}
    >
      {/* Icon container */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: 'rgba(196, 151, 58, 0.10)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: 'var(--color-gold)',
        }}
      >
        {icon}
      </div>

      {/* Text block */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-body)',
            fontWeight: 'var(--weight-medium)',
            color: 'var(--color-cream)',
            margin: 0,
            lineHeight: 1.3,
          }}
        >
          {text}
        </p>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-mono)',
            color: 'var(--color-cream-muted)',
            marginTop: 2,
            display: 'block',
          }}
        >
          {time}
        </span>
      </div>

      {/* Status dot */}
      <div
        className="tela-status-dot"
        style={{ background: dotColorMap[dotColor] }}
      />
    </motion.div>
  );
}

// ─── TELANextAction ───────────────────────────────────────────────────────────

/**
 * CTA card for "Next Action" section.
 * Label in small caps above; action text prominent; gold progress bar;
 * gold square arrow button on right.
 */
export function TELANextAction({
  label,
  action,
  progress,
  onPress,
  delay = 0,
}: NextActionProps) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      custom={delay}
      className="tela-card"
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-3)',
        }}
      >
        {/* Left: label + action */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <span className="tela-label">{label}</span>
          <h3
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 20,
              fontWeight: 'var(--weight-semibold)',
              color: 'var(--color-cream)',
              margin: '4px 0 12px',
              lineHeight: 1.2,
            }}
          >
            {action}
          </h3>

          {/* Progress bar */}
          <div
            style={{
              height: 3,
              borderRadius: 2,
              background: 'rgba(196, 151, 58, 0.20)',
              overflow: 'hidden',
            }}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: delay + 0.2 }}
              style={{
                height: '100%',
                background: 'var(--color-gold)',
                borderRadius: 2,
              }}
            />
          </div>
        </div>

        {/* Right: CTA arrow button */}
        <button
          onClick={onPress}
          aria-label={`Proceed: ${action}`}
          style={{
            width: 52,
            height: 52,
            minWidth: 52,
            borderRadius: 14,
            background: 'var(--color-gold)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-void)',
            fontSize: 22,
            fontWeight: 'var(--weight-bold)',
            transition: `background var(--duration-fast) var(--ease-out),
                         transform var(--duration-fast) var(--ease-out)`,
            flexShrink: 0,
          }}
          onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.94)')}
          onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          →
        </button>
      </div>
    </motion.div>
  );
}

// ─── Demo Page (for visual verification) ─────────────────────────────────────

/**
 * Drop this into any page route to verify the design system is working.
 * Remove from production.
 */
export default function TELACardDemo() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-void)',
        padding: 'var(--space-screen-edge)',
        paddingTop: 60,
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-section)',
        maxWidth: 430,
        margin: '0 auto',
      }}
    >
      {/* Hero Card */}
      <TELAHeroCard
        status="live"
        statusLabel="Live Status"
        title="Crusade Stage:"
        subtitle="Show Ready."
        location="Bridgestone Arena, Nashville"
        milestone="Next milestone: Load-In · Today 4:00 PM"
        imageUrl="https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800&q=80"
        delay={0}
      />

      {/* Updates section */}
      <motion.div
        className="tela-card"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={0.08}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 'var(--space-3)',
          }}
        >
          <span className="tela-label">Since You Were Last Here</span>
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--color-cream-muted)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            3 Updates
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <TELAUpdateItem
            icon="✓"
            text="Lighting cue changes complete."
            time="Today · 11:42 AM"
            dotColor="green"
            delay={0.12}
          />
          <div style={{ height: 1, background: 'var(--color-navy-border)', margin: '0 0' }} />
          <TELAUpdateItem
            icon="📄"
            text="Rigging approvals now in place."
            time="Today · 10:18 AM"
            dotColor="green"
            delay={0.16}
          />
          <div style={{ height: 1, background: 'var(--color-navy-border)', margin: '0 0' }} />
          <TELAUpdateItem
            icon="⚠"
            text="Travel lock is next major gate (5 PM)."
            time="Today · 9:37 AM"
            dotColor="amber"
            delay={0.20}
          />
        </div>
      </motion.div>

      {/* Next Action */}
      <TELANextAction
        label="Next Action"
        action="Confirm FOH Setup"
        progress={52}
        delay={0.28}
      />
    </div>
  );
}
