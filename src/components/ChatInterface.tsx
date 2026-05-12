'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

type Props = {
  wikiContext: string
}

export function ChatInterface({ wikiContext }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    if (!input.trim() || streaming) return

    const userMsg: Message = { role: 'user', content: input.trim() }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput('')
    setStreaming(true)

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    const isPearlBox = input.trim().toLowerCase().startsWith('pearl box:')

    if (isPearlBox) {
      const content = input.trim().slice('pearl box:'.length).trim()
      try {
        await fetch('/api/pearl-box', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, source: 'Chat' }),
        })
      } catch {
        // Silent — TELA will confirm in its response
      }
    }

    const assistantMsg: Message = { role: 'assistant', content: '' }
    setMessages([...nextMessages, assistantMsg])

    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages,
          wikiContext,
        }),
        signal: abortRef.current.signal,
      })

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      if (!reader) throw new Error('No stream')

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') break
          try {
            const parsed = JSON.parse(data)
            if (parsed.text) {
              accumulated += parsed.text
              setMessages((prev) => {
                const updated = [...prev]
                updated[updated.length - 1] = { role: 'assistant', content: accumulated }
                return updated
              })
            }
          } catch {
            // skip malformed
          }
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name !== 'AbortError') {
        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: 'Error reaching TELA. Check your API connection.' }
          return updated
        })
      }
    } finally {
      setStreaming(false)
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px - 44px)', background: '#0D1B2A' }}>
      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 0' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px' }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', paddingTop: '15vh' }}>
              <p style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 32,
                fontWeight: 300,
                color: 'rgba(196,151,58,0.6)',
                letterSpacing: '0.1em',
                marginBottom: 12,
              }}>
                TELA
              </p>
              <p style={{ fontSize: 13, color: 'rgba(234,224,210,0.25)', fontWeight: 300 }}>
                Operational runtime active.
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                marginBottom: 24,
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              {msg.role === 'user' ? (
                <div style={{
                  maxWidth: '72%',
                  background: 'rgba(234,224,210,0.06)',
                  border: '1px solid rgba(234,224,210,0.1)',
                  padding: '10px 16px',
                  fontSize: 14,
                  color: '#EAE0D2',
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 300,
                  lineHeight: 1.6,
                }}>
                  {msg.content}
                </div>
              ) : (
                <div style={{
                  maxWidth: '85%',
                  borderLeft: '2px solid #C4973A',
                  paddingLeft: 16,
                }}>
                  <p style={{
                    fontSize: 14,
                    color: '#EAE0D2',
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 300,
                    lineHeight: 1.7,
                    whiteSpace: 'pre-wrap',
                  }}>
                    {msg.content}
                    {streaming && i === messages.length - 1 && (
                      <span style={{
                        display: 'inline-block',
                        width: 2,
                        height: 14,
                        background: '#C4973A',
                        marginLeft: 2,
                        verticalAlign: 'text-bottom',
                        animation: 'pulse-red 1s ease-in-out infinite',
                      }} />
                    )}
                  </p>
                </div>
              )}
            </div>
          ))}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div style={{
        borderTop: '1px solid rgba(234,224,210,0.08)',
        padding: '16px 24px',
      }}>
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div style={{
            flex: 1,
            border: '1px solid rgba(234,224,210,0.12)',
            background: 'rgba(255,255,255,0.02)',
            padding: '10px 14px',
            transition: 'border-color 0.2s',
          }}
            onFocusCapture={(e) => (e.currentTarget.style.borderColor = 'rgba(196,151,58,0.4)')}
            onBlurCapture={(e) => (e.currentTarget.style.borderColor = 'rgba(234,224,210,0.12)')}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
              }}
              onKeyDown={handleKeyDown}
              placeholder="Speak to TELA…"
              rows={1}
              disabled={streaming}
              style={{
                background: 'none',
                border: 'none',
                outline: 'none',
                color: '#EAE0D2',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                fontWeight: 300,
                width: '100%',
                resize: 'none',
                lineHeight: 1.5,
                maxHeight: 160,
                overflow: 'auto',
              }}
            />
          </div>

          <button
            onClick={sendMessage}
            disabled={!input.trim() || streaming}
            style={{
              background: 'none',
              border: '1px solid rgba(196,151,58,0.3)',
              color: !input.trim() || streaming ? 'rgba(196,151,58,0.3)' : '#C4973A',
              cursor: !input.trim() || streaming ? 'default' : 'pointer',
              padding: '10px 20px',
              fontSize: 12,
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 400,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            {streaming ? '…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}
