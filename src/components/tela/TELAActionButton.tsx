'use client'

/**
 * TELAActionButton.tsx
 * Renders a tappable commit button for a TELA-proposed action.
 * Shown inline in the chat after parseTelaActions() finds <<ACTION:{}>> tags.
 *
 * States: idle → signoff → executing → done | error
 */

import { useState } from 'react'
import { type TelaAction, type TelaSignoff, getActionLabel } from '@/lib/tela/useTelaActions'

interface TELAActionButtonProps {
  action: TelaAction
  onExecute: (action: TelaAction, signoff: TelaSignoff) => Promise<boolean>
}

type State = 'idle' | 'signoff' | 'done' | 'error'

export function TELAActionButton({ action, onExecute }: TELAActionButtonProps) {
  const [state, setState] = useState<State>('idle')
  const [executing, setExecuting] = useState(false)
  const [reason, setReason] = useState('')
  const [affectsSafety, setAffectsSafety] = useState(false)
  const [affectsTime, setAffectsTime] = useState(false)
  const [affectsMoney, setAffectsMoney] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleCommit = async () => {
    setExecuting(true)
    const ok = await onExecute(action, {
      reason: reason.trim() || 'Approved via TELA',
      affects_safety: affectsSafety,
      affects_time: affectsTime,
      affects_money: affectsMoney,
    })
    setExecuting(false)
    if (ok) {
      setState('done')
    } else {
      setErrorMsg('Action failed — check console')
      setState('error')
    }
  }

  if (state === 'done') {
    return (
      <div style={{
        marginTop: 10,
        padding: '8px 14px',
        background: 'rgba(76,175,110,0.12)',
        border: '1px solid rgba(76,175,110,0.3)',
        borderRadius: 8,
        fontFamily: "'DM Mono', monospace",
        fontSize: 11,
        color: '#4CAF6E',
        letterSpacing: '0.06em',
      }}>
        ✓ {getActionLabel(action)} — committed
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div style={{
        marginTop: 10,
        padding: '8px 14px',
        background: 'rgba(192,57,43,0.12)',
        border: '1px solid rgba(192,57,43,0.3)',
        borderRadius: 8,
        fontFamily: "'DM Mono', monospace",
        fontSize: 11,
        color: '#C0392B',
        letterSpacing: '0.06em',
      }}>
        ✗ {errorMsg}
      </div>
    )
  }

  if (state === 'signoff') {
    return (
      <div style={{
        marginTop: 10,
        padding: 16,
        background: 'rgba(13,27,42,0.95)',
        border: '1px solid rgba(196,151,58,0.3)',
        borderRadius: 12,
      }}>
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 13,
          color: '#EAE0D2',
          marginBottom: 10,
          fontWeight: 500,
        }}>
          Confirm: {getActionLabel(action)}
        </p>

        {/* Reason */}
        <textarea
          autoFocus
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Why are you approving this? (optional)"
          rows={2}
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(234,224,210,0.12)',
            borderRadius: 6,
            padding: '8px 10px',
            color: '#EAE0D2',
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13,
            resize: 'none',
            outline: 'none',
            boxSizing: 'border-box',
            marginBottom: 10,
          }}
        />

        {/* Impact flags */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {[
            { label: '⚠ Safety', value: affectsSafety, set: setAffectsSafety },
            { label: '⏱ Time',   value: affectsTime,   set: setAffectsTime },
            { label: '💰 Money', value: affectsMoney,   set: setAffectsMoney },
          ].map(({ label, value, set }) => (
            <button
              key={label}
              onClick={() => set(!value)}
              style={{
                padding: '4px 12px',
                borderRadius: 20,
                border: `1px solid ${value ? 'rgba(196,151,58,0.6)' : 'rgba(234,224,210,0.15)'}`,
                background: value ? 'rgba(196,151,58,0.15)' : 'transparent',
                color: value ? '#C4973A' : 'rgba(234,224,210,0.45)',
                fontFamily: "'DM Mono', monospace",
                fontSize: 11,
                cursor: 'pointer',
                letterSpacing: '0.04em',
                transition: 'all 0.15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleCommit}
            disabled={executing}
            style={{
              flex: 1,
              padding: '9px 0',
              background: executing ? 'rgba(196,151,58,0.5)' : '#C4973A',
              border: 'none',
              borderRadius: 8,
              color: '#0A0E17',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
              fontWeight: 600,
              cursor: executing ? 'default' : 'pointer',
              letterSpacing: '0.02em',
              transition: 'background 0.15s',
            }}
          >
            {executing ? 'Committing…' : 'Commit'}
          </button>
          <button
            onClick={() => setState('idle')}
            disabled={executing}
            style={{
              padding: '9px 16px',
              background: 'transparent',
              border: '1px solid rgba(234,224,210,0.12)',
              borderRadius: 8,
              color: 'rgba(234,224,210,0.45)',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
              cursor: executing ? 'default' : 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  // idle
  return (
    <button
      onClick={() => setState('signoff')}
      style={{
        marginTop: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 16px',
        background: 'rgba(196,151,58,0.1)',
        border: '1px solid rgba(196,151,58,0.3)',
        borderRadius: 8,
        color: '#C4973A',
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 13,
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.15s',
        letterSpacing: '0.01em',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(196,151,58,0.18)'
        e.currentTarget.style.borderColor = 'rgba(196,151,58,0.5)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'rgba(196,151,58,0.1)'
        e.currentTarget.style.borderColor = 'rgba(196,151,58,0.3)'
      }}
    >
      <span style={{ fontSize: 14 }}>⬡</span>
      {getActionLabel(action)}
    </button>
  )
}
