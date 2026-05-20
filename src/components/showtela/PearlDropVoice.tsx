'use client'
import { useState, useRef, useEffect } from 'react'

type State = 'idle' | 'listening' | 'processing' | 'success' | 'error'

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance
    webkitSpeechRecognition: new () => SpeechRecognitionInstance
  }
}

interface SpeechRecognitionInstance {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList
}

export function PearlDropVoice({ onClose, taggedPerson, submittedBy }: {
  onClose: () => void
  taggedPerson?: string
  submittedBy?: string
}) {
  const [state, setState] = useState<State>('idle')
  const [transcript, setTranscript] = useState('')
  const [message, setMessage] = useState('')
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const transcriptRef = useRef<string>('')
  const mountedRef = useRef(true)

  // Stop every hardware track on the captured MediaStream.
  // This is what actually dismisses the orange iPhone mic indicator —
  // recognition.abort() alone does not release the underlying getUserMedia track on iOS Safari.
  const killStream = () => {
    const s = streamRef.current
    if (!s) return
    s.getTracks().forEach((t) => { try { t.stop() } catch { /* already stopped */ } })
    streamRef.current = null
  }

  // Null all handlers → abort recognition → kill hardware tracks.
  // Order matters: null first so no stale callback fires during abort.
  const killRecognition = () => {
    const r = recognitionRef.current
    if (!r) return
    r.onresult = null
    r.onend = null
    r.onerror = null
    try { r.abort() } catch { /* already terminated */ }
    recognitionRef.current = null
    killStream()
  }

  // Unmount cleanup — covers navigation away, parent teardown, hot reload
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      killRecognition()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const safeClose = () => {
    killRecognition()
    onClose()
  }

  const submit = async (text: string) => {
    if (!text.trim()) {
      if (mountedRef.current) setState('idle')
      return
    }
    if (mountedRef.current) setState('processing')
    try {
      const res = await fetch('/api/pearl-drop-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text, taggedPerson, submittedBy }),
      })
      const data = await res.json() as { message?: string; error?: string }
      if (data.error) throw new Error(data.error)
      if (!mountedRef.current) return
      // killRecognition also calls killStream — full hardware teardown on success
      killRecognition()
      setState('success')
      setMessage(data.message ?? 'Saved to TELA Inbox')
      setTimeout(() => { if (mountedRef.current) onClose() }, 2500)
    } catch {
      if (!mountedRef.current) return
      // killRecognition also calls killStream — full hardware teardown on error
      killRecognition()
      setState('error')
      setMessage('Failed to save. Try again.')
    }
  }

  const startListening = () => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!SR) {
      setState('error')
      setMessage('Voice not supported. Try Chrome.')
      return
    }
    killRecognition()
    transcriptRef.current = ''
    setTranscript('')

    // iOS Safari: webkitSpeechRecognition calls getUserMedia internally and never exposes
    // the resulting MediaStream. We intercept the call once to capture the stream ref so
    // we can explicitly stop all hardware tracks on every exit path.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const md = navigator.mediaDevices as any
    if (md && typeof md.getUserMedia === 'function') {
      const orig = md.getUserMedia.bind(md) as typeof navigator.mediaDevices.getUserMedia
      md.getUserMedia = async (constraints: MediaStreamConstraints) => {
        const stream = await orig(constraints)
        streamRef.current = stream
        md.getUserMedia = orig   // restore immediately after first capture
        return stream
      }
    }

    const recognition = new SR()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognitionRef.current = recognition

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const t = Array.from(event.results).map((r) => r[0].transcript).join('')
      transcriptRef.current = t
      if (mountedRef.current) setTranscript(t)
    }

    // onend fires after stop() completes — natural end of the recognition session.
    // Null the ref first, then kill hardware tracks before calling submit.
    recognition.onend = () => {
      recognitionRef.current = null
      killStream()   // hardware teardown on natural end — orange dot must go here
      const final = transcriptRef.current
      if (!mountedRef.current) return
      if (final.trim()) {
        submit(final)
      } else {
        setState('idle')
      }
    }

    recognition.onerror = () => {
      recognitionRef.current = null
      killStream()   // hardware teardown on error
      if (!mountedRef.current) return
      setState('error')
      setMessage('Could not hear. Try again.')
    }

    recognition.start()
    if (mountedRef.current) setState('listening')
  }

  // Normal recording end — stop() lets iOS finish processing and fires onend,
  // which handles killStream. Do NOT null handlers here; onend needs to run.
  const stopListening = () => {
    const r = recognitionRef.current
    if (!r) return
    try { r.stop() } catch { /* already stopped */ }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={safeClose}
    >
      <div
        className="relative mx-4 w-full max-w-xs overflow-hidden rounded-3xl bg-stone-900 p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center gap-6">
          <div className="text-center">
            <p className="text-xs uppercase tracking-widest text-yellow-500">Pearl Drop</p>
            {taggedPerson && <p className="mt-1 text-sm font-medium text-stone-300">Tagged: {taggedPerson}</p>}
            <p className="mt-1 text-xs text-stone-500">Speak to update TELA Inbox</p>
          </div>

          <button
            onMouseDown={startListening}
            onMouseUp={stopListening}
            onTouchStart={startListening}
            onTouchEnd={stopListening}
            disabled={state === 'processing' || state === 'success'}
            className="flex h-24 w-24 items-center justify-center rounded-full transition-all active:scale-95"
            style={{
              background: state === 'listening' ? '#DC2626' : '#C89B2F',
              boxShadow: state === 'listening'
                ? '0 0 0 16px rgba(220,38,38,0.15)'
                : '0 0 0 8px rgba(200,155,47,0.15)',
            }}
          >
            {state === 'processing' ? (
              <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2" strokeDasharray="32" strokeDashoffset="12" />
              </svg>
            ) : state === 'success' ? (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <rect x="9" y="2" width="6" height="12" rx="3" fill="white" />
                <path d="M5 10a7 7 0 0014 0" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <path d="M12 19v3" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
          </button>

          <div className="text-center">
            {state === 'idle'       && <p className="text-sm text-stone-400">Hold to speak</p>}
            {state === 'listening'  && <p className="text-sm text-red-400">Listening… release when done</p>}
            {state === 'processing' && <p className="text-sm text-yellow-400">Routing to Notion…</p>}
            {state === 'success'    && <p className="text-sm text-green-400">{message}</p>}
            {state === 'error'      && <p className="text-sm text-red-400">{message}</p>}
          </div>

          {transcript && (
            <div className="w-full rounded-xl bg-white/10 px-4 py-3">
              <p className="text-center text-xs italic text-stone-400">&ldquo;{transcript}&rdquo;</p>
            </div>
          )}

          {state === 'idle' && (
            <div className="w-full space-y-1.5">
              {[
                'Potential lighting designer, Marcus Webb, 615-555-0192',
                "Unresolved — Juan hasn't confirmed stage plot",
                'Feed update — bus call moved to 8:50 AM',
              ].map((ex) => (
                <button
                  key={ex}
                  onClick={() => submit(ex)}
                  className="w-full rounded-xl bg-white/10 px-3 py-2 text-left text-xs text-stone-400"
                >
                  &ldquo;{ex}&rdquo;
                </button>
              ))}
            </div>
          )}

          <button onClick={safeClose} className="text-xs text-stone-600">Cancel</button>
        </div>
      </div>
    </div>
  )
}
