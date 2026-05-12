'use client'

import { useState, useRef, KeyboardEvent } from 'react'

type PearlItem = {
  id: string
  content: string
  source: string
  createdAt: string
}

type Props = {
  items: PearlItem[]
  onCapture: (content: string) => Promise<void>
  onRefresh: () => void
  loading: boolean
}

export function PearlBoxCapture({ items, onCapture, onRefresh, loading }: Props) {
  const [input, setInput] = useState('')
  const [capturing, setCapturing] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  async function handleCapture() {
    if (!input.trim() || capturing) return
    setCapturing(true)
    await onCapture(input.trim())
    setInput('')
    setCapturing(false)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleCapture()
    }
  }

  function formatTime(iso: string) {
    const d = new Date(iso)
    const mo = d.getMonth() + 1
    const dt = d.getDate()
    const hrs = d.getHours()
    const min = d.getMinutes().toString().padStart(2, '0')
    const ampm = hrs >= 12 ? 'P' : 'A'
    const h = hrs % 12 || 12
    return `${mo}/${dt} ${h}:${min}${ampm}`
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 14,
          fontWeight: 400,
          color: 'rgba(234,224,210,0.5)',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
        }}>
          Pearl Box
        </span>
        <button
          onClick={onRefresh}
          disabled={loading}
          style={{
            background: 'none',
            border: 'none',
            cursor: loading ? 'default' : 'pointer',
            color: 'rgba(234,224,210,0.3)',
            fontSize: 11,
            fontFamily: "'DM Sans', sans-serif",
            padding: 0,
          }}
        >
          {loading ? '…' : '↻'}
        </button>
      </div>

      {/* Capture input */}
      <div style={{
        border: '1px solid rgba(234,224,210,0.1)',
        background: 'rgba(255,255,255,0.02)',
        padding: '10px 12px',
        transition: 'border-color 0.2s',
      }}
        onFocusCapture={(e) => (e.currentTarget.style.borderColor = 'rgba(196,151,58,0.4)')}
        onBlurCapture={(e) => (e.currentTarget.style.borderColor = 'rgba(234,224,210,0.1)')}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            e.target.style.height = 'auto'
            e.target.style.height = e.target.scrollHeight + 'px'
          }}
          onKeyDown={handleKeyDown}
          placeholder="Pearl Box: capture a thought…"
          rows={1}
          style={{
            background: 'none',
            border: 'none',
            outline: 'none',
            color: '#EAE0D2',
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13,
            fontWeight: 300,
            width: '100%',
            resize: 'none',
            lineHeight: 1.5,
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
          <button
            onClick={handleCapture}
            disabled={!input.trim() || capturing}
            style={{
              background: !input.trim() || capturing ? 'none' : 'rgba(196,151,58,0.1)',
              border: '1px solid rgba(196,151,58,0.3)',
              color: !input.trim() || capturing ? 'rgba(196,151,58,0.3)' : '#C4973A',
              cursor: !input.trim() || capturing ? 'default' : 'pointer',
              padding: '3px 12px',
              fontSize: 11,
              fontFamily: "'DM Sans', sans-serif",
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              transition: 'all 0.15s',
            }}
          >
            {capturing ? '…' : 'Capture'}
          </button>
        </div>
      </div>

      {/* Inbox */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.length === 0 && !loading && (
          <p style={{ color: 'rgba(234,224,210,0.2)', fontSize: 12, fontStyle: 'italic', textAlign: 'center', marginTop: 24 }}>
            Inbox empty
          </p>
        )}
        {items.map((item) => (
          <div
            key={item.id}
            className="tela-card"
            style={{ padding: '10px 12px' }}
          >
            <p style={{ fontSize: 13, color: '#EAE0D2', lineHeight: 1.5, marginBottom: 6 }}>
              {item.content}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'rgba(234,224,210,0.25)' }}>
                {item.source} · {formatTime(item.createdAt)}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#C4973A', fontSize: 11, fontFamily: "'DM Sans', sans-serif",
                  letterSpacing: '0.06em', textTransform: 'uppercase', padding: 0,
                }}>
                  Promote
                </button>
                <button style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(234,224,210,0.25)', fontSize: 11, fontFamily: "'DM Sans', sans-serif",
                  letterSpacing: '0.06em', textTransform: 'uppercase', padding: 0,
                }}>
                  Discard
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
