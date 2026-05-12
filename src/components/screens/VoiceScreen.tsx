'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const EXAMPLE_PROMPTS = [
  'Where did we leave off?',
  'Pull the latest thread.',
  'Show me everything tied to John Bowers.',
  "What's the most important thing today?",
]

type SpeechRecognitionEvent = {
  results: SpeechRecognitionResultList
}

type SpeechRecognitionResultList = {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

type SpeechRecognitionResult = {
  isFinal: boolean
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}

type SpeechRecognitionAlternative = {
  transcript: string
  confidence: number
}

type SpeechRecognitionInstance = {
  continuous: boolean
  interimResults: boolean
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onend: (() => void) | null
  onerror: ((event: { error: string }) => void) | null
}

function getSpeechRecognition(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionInstance
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export default function VoiceScreen() {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [telaResponse, setTelaResponse] = useState<string | null>(null)
  const [waveValues, setWaveValues] = useState<number[]>(Array(20).fill(8))
  const [voiceAvailable, setVoiceAvailable] = useState(true)
  const [loading, setLoading] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const waveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const SR = getSpeechRecognition()
    if (!SR) {
      setVoiceAvailable(false)
    }
    return () => {
      if (waveIntervalRef.current) clearInterval(waveIntervalRef.current)
    }
  }, [])

  useEffect(() => {
    if (isListening) {
      waveIntervalRef.current = setInterval(() => {
        setWaveValues(Array.from({ length: 20 }, () => Math.random() * 28 + 4))
      }, 100)
    } else {
      if (waveIntervalRef.current) {
        clearInterval(waveIntervalRef.current)
        waveIntervalRef.current = null
      }
      setWaveValues(Array(20).fill(8))
    }
  }, [isListening])

  async function sendToTela(text: string) {
    setLoading(true)
    setTelaResponse('')
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: text }],
        }),
      })

      if (!res.ok) {
        setTelaResponse('Unable to reach TELA at this time.')
        return
      }

      const contentType = res.headers.get('content-type') ?? ''

      if (contentType.includes('text/event-stream') || contentType.includes('text/plain')) {
        // SSE streaming
        const reader = res.body?.getReader()
        if (!reader) {
          setTelaResponse('No response stream.')
          return
        }
        const decoder = new TextDecoder()
        let buffer = ''
        let full = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') continue
              try {
                const parsed = JSON.parse(data) as {
                  choices?: Array<{ delta?: { content?: string } }>
                  content?: string
                  text?: string
                }
                const chunk =
                  parsed?.choices?.[0]?.delta?.content ??
                  parsed?.content ??
                  parsed?.text ??
                  ''
                full += chunk
                setTelaResponse(full)
              } catch {
                full += data
                setTelaResponse(full)
              }
            }
          }
        }
      } else {
        const data = await res.json() as {
          message?: string
          content?: string
          text?: string
        }
        setTelaResponse(
          data?.message ?? data?.content ?? data?.text ?? JSON.stringify(data)
        )
      }
    } catch {
      setTelaResponse('Connection error. Try again.')
    } finally {
      setLoading(false)
    }
  }

  function toggleListening() {
    if (isListening) {
      // Stop
      recognitionRef.current?.stop()
      recognitionRef.current = null
      setIsListening(false)
      return
    }

    const SR = getSpeechRecognition()
    if (!SR) {
      setVoiceAvailable(false)
      return
    }

    try {
      const recognition = new SR()
      recognition.continuous = false
      recognition.interimResults = true

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim = ''
        let final = ''
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i]
          const text = result[0].transcript
          if (result.isFinal) {
            final += text
          } else {
            interim += text
          }
        }
        setTranscript(final || interim)
        if (final) {
          sendToTela(final)
        }
      }

      recognition.onend = () => {
        setIsListening(false)
        recognitionRef.current = null
      }

      recognition.onerror = (event: { error: string }) => {
        if (event.error !== 'aborted') {
          setTelaResponse(`Speech error: ${event.error}`)
        }
        setIsListening(false)
        recognitionRef.current = null
      }

      recognition.start()
      recognitionRef.current = recognition
      setIsListening(true)
      setTranscript('')
      setTelaResponse(null)
    } catch {
      setVoiceAvailable(false)
    }
  }

  if (!voiceAvailable) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: 24,
        textAlign: 'center',
      }}>
        <div style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 36,
          fontWeight: 300,
          color: 'var(--gold-primary)',
          opacity: 0.8,
          marginBottom: 16,
        }}>
          TELAdex
        </div>
        <div style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 14,
          fontWeight: 300,
          color: 'var(--text-muted)',
        }}>
          Voice not available in this browser.
        </div>
        <div style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 11,
          color: 'var(--text-muted)',
          marginTop: 8,
          opacity: 0.6,
        }}>
          Try Chrome or Safari.
        </div>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      padding: '24px 20px',
      textAlign: 'center',
    }}>
      {/* Wordmark */}
      <div style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: 36,
        fontWeight: 300,
        color: 'var(--gold-primary)',
        opacity: isListening ? 0.4 : 0.8,
        transition: 'opacity 0.3s',
        marginBottom: 8,
      }}>
        TELAdex
      </div>

      {!isListening && (
        <div style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 13,
          fontWeight: 300,
          color: 'var(--text-muted)',
          marginBottom: 40,
        }}>
          Speak naturally.
        </div>
      )}

      {/* Waveform (when listening) */}
      {isListening && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          height: 48,
          marginBottom: 20,
        }}>
          {waveValues.map((h, i) => (
            <motion.div
              key={i}
              animate={{ height: h }}
              transition={{ duration: 0.1, ease: 'linear' }}
              style={{
                width: 3,
                background: 'var(--gold-primary)',
                borderRadius: 1.5,
              }}
            />
          ))}
        </div>
      )}

      {isListening && (
        <div style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 11,
          color: 'var(--gold-primary)',
          letterSpacing: '0.15em',
          marginBottom: 16,
        }}>
          Listening…
        </div>
      )}

      {/* Transcript */}
      {transcript && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 15,
            fontWeight: 300,
            color: 'var(--text-secondary)',
            marginBottom: 20,
            maxWidth: 320,
            lineHeight: 1.5,
          }}
        >
          "{transcript}"
        </motion.div>
      )}

      {/* Mic button */}
      <button
        onClick={toggleListening}
        style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          border: `2px solid ${isListening ? 'var(--gold-primary)' : 'var(--gold-border)'}`,
          background: isListening ? 'var(--gold-dim)' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
          color: isListening ? 'var(--gold-primary)' : 'var(--gold-border)',
          cursor: 'pointer',
          marginBottom: 40,
          transition: 'all 0.2s',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {isListening ? '◉' : '◎'}
      </button>

      {/* Example prompts (only when not listening) */}
      {!isListening && !transcript && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 280 }}>
          {EXAMPLE_PROMPTS.map((prompt, i) => (
            <motion.div
              key={prompt}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}
              onClick={() => {
                setTranscript(prompt)
                sendToTela(prompt)
              }}
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                fontWeight: 300,
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '6px 12px',
                border: '1px solid var(--border-subtle)',
                borderRadius: 2,
                background: 'var(--bg-card)',
                transition: 'border-color 0.2s',
              }}
            >
              {prompt}
            </motion.div>
          ))}
        </div>
      )}

      {/* TELA response */}
      <AnimatePresence>
        {(telaResponse !== null || loading) && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{
              width: '100%',
              maxWidth: 400,
              marginTop: 24,
              background: 'var(--bg-card)',
              borderLeft: '2px solid var(--gold-primary)',
              padding: 16,
              textAlign: 'left',
            }}
          >
            <div style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 10,
              color: 'var(--gold-primary)',
              letterSpacing: '0.15em',
              marginBottom: 8,
            }}>
              TELA
            </div>
            {loading && !telaResponse ? (
              <div style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 11,
                color: 'var(--text-muted)',
              }}>
                Processing…
              </div>
            ) : (
              <div style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                fontWeight: 300,
                color: 'var(--text-primary)',
                lineHeight: 1.6,
              }}>
                {telaResponse}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
