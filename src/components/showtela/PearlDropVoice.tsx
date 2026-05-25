'use client'
import { useState, useRef, useEffect } from 'react'

type State =
  | 'idle'
  | 'requesting'
  | 'recording'
  | 'stopping'
  | 'transcribing'
  | 'editing'
  | 'submitting'
  | 'success'
  | 'error'

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

  // ── Phase 1: MediaRecorder refs ───────────────────────────────────────────
  const streamRef = useRef<MediaStream | null>(null)       // getUserMedia stream
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const blobRef = useRef<Blob | null>(null)                // retained for Whisper later

  // ── Phase 2: SpeechRecognition refs (transcription only, post-recording) ──
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const rStreamRef = useRef<MediaStream | null>(null)      // recognition's own stream
  const rTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const mountedRef = useRef(true)

  // Kill the SpeechRecognition session and its hardware stream.
  // Called only from the transcription phase — never touches the recorder stream.
  const killRecognition = () => {
    if (rTimerRef.current) { clearTimeout(rTimerRef.current); rTimerRef.current = null }
    const r = recognitionRef.current
    if (r) {
      r.onresult = null
      r.onend = null
      r.onerror = null
      try { r.abort() } catch { /* already terminated */ }
      recognitionRef.current = null
    }
    const rs = rStreamRef.current
    if (rs) {
      rs.getTracks().forEach((t) => { try { t.stop() } catch { /* already stopped */ } })
      rStreamRef.current = null
    }
  }

  // Full teardown — kills both phases. Safe from any state.
  const teardownAll = () => {
    killRecognition()
    const rec = recorderRef.current
    if (rec) {
      rec.ondataavailable = null
      rec.onstop = null
      rec.onerror = null
      try { if (rec.state !== 'inactive') rec.stop() } catch { /* already stopped */ }
      recorderRef.current = null
    }
    const stream = streamRef.current
    if (stream) {
      stream.getTracks().forEach((t) => { try { t.stop() } catch { /* already stopped */ } })
      streamRef.current = null
    }
    chunksRef.current = []
  }

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      teardownAll()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const safeClose = () => { teardownAll(); onClose() }
  const reset = () => { teardownAll(); setTranscript(''); setMessage(''); setState('idle') }

  // ── Phase 1: Recording ────────────────────────────────────────────────────

  const startRecording = async () => {
    if (mountedRef.current) setState('requesting')
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      if (!mountedRef.current) return
      setState('error')
      setMessage('Microphone access denied.')
      return
    }
    if (!mountedRef.current) { stream.getTracks().forEach((t) => t.stop()); return }

    streamRef.current = stream
    chunksRef.current = []

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/mp4')
      ? 'audio/mp4'
      : ''
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    recorderRef.current = recorder

    recorder.ondataavailable = (e: BlobEvent) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    // onstop fires after the final ondataavailable — hardware is already dead here
    // because stopRecording() kills tracks synchronously before onstop can fire.
    recorder.onstop = () => {
      recorderRef.current = null
      blobRef.current = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/mp4' })
      chunksRef.current = []
      if (!mountedRef.current) return
      startTranscription()
    }

    recorder.onerror = () => {
      teardownAll()
      if (!mountedRef.current) return
      setState('error')
      setMessage('Recording failed. Try again.')
    }

    recorder.start()
    if (mountedRef.current) setState('recording')
  }

  const stopRecording = () => {
    const rec = recorderRef.current
    if (!rec || rec.state === 'inactive') return
    // Stop recorder — triggers ondataavailable (final chunk) then onstop
    try { rec.stop() } catch { /* already stopped */ }
    // Kill hardware tracks IMMEDIATELY and synchronously.
    // Orange mic indicator releases here — before onstop fires, before transcription starts.
    const stream = streamRef.current
    if (stream) {
      stream.getTracks().forEach((t) => { try { t.stop() } catch { /* already stopped */ } })
      streamRef.current = null
    }
    if (mountedRef.current) setState('stopping')
  }

  // ── Phase 2: Browser-native transcription (post-recording) ───────────────
  //
  // Opens a fresh SpeechRecognition session only AFTER all Phase 1 hardware
  // is fully terminated. This session has its own stream reference captured
  // via getUserMedia intercept so every track can be killed explicitly.
  //
  // When OPENAI_API_KEY is available, replace startTranscription() with a
  // call to /api/transcribe-audio using blobRef.current — no UX change needed.

  const startTranscription = () => {
    if (!mountedRef.current) return
    setState('transcribing')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window.SpeechRecognition ?? window.webkitSpeechRecognition) as (new () => SpeechRecognitionInstance) | undefined
    if (!SR) {
      // SpeechRecognition unavailable — fall directly to manual entry
      setState('editing')
      return
    }

    // Intercept getUserMedia to capture this session's stream for explicit teardown.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const md = navigator.mediaDevices as any
    if (md && typeof md.getUserMedia === 'function') {
      const orig = md.getUserMedia.bind(md) as typeof navigator.mediaDevices.getUserMedia
      md.getUserMedia = async (constraints: MediaStreamConstraints) => {
        const stream = await orig(constraints)
        rStreamRef.current = stream
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
      const text = Array.from(event.results).map((r) => r[0].transcript).join(' ')
      if (mountedRef.current) setTranscript(text)
    }

    // onend fires after recognition completes naturally — kill hardware then show editor
    recognition.onend = () => {
      recognitionRef.current = null
      if (rTimerRef.current) { clearTimeout(rTimerRef.current); rTimerRef.current = null }
      const rs = rStreamRef.current
      if (rs) {
        rs.getTracks().forEach((t) => { try { t.stop() } catch { /* already stopped */ } })
        rStreamRef.current = null
      }
      if (!mountedRef.current) return
      setState('editing')
    }

    recognition.onerror = () => {
      if (rTimerRef.current) { clearTimeout(rTimerRef.current); rTimerRef.current = null }
      const rs = rStreamRef.current
      if (rs) {
        rs.getTracks().forEach((t) => { try { t.stop() } catch { /* already stopped */ } })
        rStreamRef.current = null
      }
      recognitionRef.current = null
      if (!mountedRef.current) return
      setState('editing')   // fall to manual entry on recognition error
    }

    recognition.start()

    // Fallback: if no recognition fires within 12 seconds, advance to manual entry
    rTimerRef.current = setTimeout(() => {
      killRecognition()
      if (mountedRef.current) setState('editing')
    }, 12000)
  }

  const stopTranscription = () => {
    const r = recognitionRef.current
    if (!r) return
    try { r.stop() } catch { /* already stopped */ }
    // onend will handle stream teardown and state transition
  }

  // ── Phase 3: Submit ───────────────────────────────────────────────────────

  const submit = async () => {
    if (!transcript.trim()) return
    setState('submitting')
    try {
      const res = await fetch('/api/pearl-drop-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, taggedPerson, submittedBy }),
      })
      const data = await res.json() as { message?: string; error?: string }
      if (data.error) throw new Error(data.error)
      if (!mountedRef.current) return
      setState('success')
      setMessage(data.message ?? 'Saved to TELA Inbox')
      setTimeout(() => { if (mountedRef.current) onClose() }, 2500)
    } catch {
      if (!mountedRef.current) return
      setState('error')
      setMessage('Failed to save. Try again.')
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const isRecordingPhase = state === 'idle' || state === 'requesting' || state === 'recording' || state === 'stopping'

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
            {taggedPerson && (
              <p className="mt-1 text-sm font-medium text-stone-300">Tagged: {taggedPerson}</p>
            )}
          </div>

          {/* Phase 1: Record */}
          {isRecordingPhase && (
            <>
              <button
                onClick={state === 'idle' ? startRecording : state === 'recording' ? stopRecording : undefined}
                disabled={state === 'requesting' || state === 'stopping'}
                className="flex h-24 w-24 items-center justify-center rounded-full transition-all active:scale-95 disabled:opacity-40"
                style={{
                  background: state === 'recording' ? '#DC2626' : '#C89B2F',
                  boxShadow: state === 'recording'
                    ? '0 0 0 16px rgba(220,38,38,0.15)'
                    : '0 0 0 8px rgba(200,155,47,0.15)',
                }}
              >
                {(state === 'requesting' || state === 'stopping') ? (
                  <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2" strokeDasharray="32" strokeDashoffset="12" />
                  </svg>
                ) : state === 'recording' ? (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <rect x="6" y="6" width="12" height="12" rx="2" fill="white" />
                  </svg>
                ) : (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <rect x="9" y="2" width="6" height="12" rx="3" fill="white" />
                    <path d="M5 10a7 7 0 0014 0" stroke="white" strokeWidth="2" strokeLinecap="round" />
                    <path d="M12 19v3" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                )}
              </button>
              <p className="text-sm text-center" style={{ color: state === 'recording' ? '#f87171' : '#a8a29e' }}>
                {state === 'idle'       && 'Tap to record'}
                {state === 'requesting' && 'Requesting mic…'}
                {state === 'recording'  && 'Recording — tap to stop'}
                {state === 'stopping'   && 'Finalizing…'}
              </p>
            </>
          )}

          {/* Phase 2: Transcription */}
          {state === 'transcribing' && (
            <div className="w-full flex flex-col items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: 'rgba(200,155,47,0.12)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <rect x="9" y="2" width="6" height="12" rx="3" fill="#C89B2F" />
                  <path d="M5 10a7 7 0 0014 0" stroke="#C89B2F" strokeWidth="2" strokeLinecap="round" />
                  <path d="M12 19v3" stroke="#C89B2F" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm text-yellow-400">Now say your note</p>
                <p className="mt-1 text-xs text-stone-600">Mic just reopened for transcription</p>
              </div>
              {transcript && (
                <div className="w-full rounded-xl bg-white/10 px-4 py-3">
                  <p className="text-center text-xs italic text-stone-400">&ldquo;{transcript}&rdquo;</p>
                </div>
              )}
              <div className="flex gap-4">
                <button onClick={stopTranscription} className="text-xs text-yellow-600">
                  Done speaking
                </button>
                <button onClick={() => { killRecognition(); setState('editing') }} className="text-xs text-stone-600">
                  Type instead
                </button>
              </div>
            </div>
          )}

          {/* Phase 3: Edit + confirm */}
          {state === 'editing' && (
            <div className="w-full flex flex-col gap-4">
              <p className="text-xs uppercase tracking-widest text-stone-500 text-center">Review &amp; confirm</p>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Type your note…"
                rows={4}
                className="w-full rounded-xl bg-white/10 px-4 py-3 text-sm text-stone-200 placeholder-stone-600 resize-none focus:outline-none focus:ring-1 focus:ring-yellow-500/40"
                autoFocus
              />
              <button
                onClick={submit}
                disabled={!transcript.trim()}
                className="w-full rounded-xl py-3 text-sm font-semibold text-stone-900 disabled:opacity-40"
                style={{ background: '#C89B2F' }}
              >
                Confirm &amp; Send
              </button>
              <button onClick={reset} className="text-xs text-stone-600 text-center">
                Re-record
              </button>
            </div>
          )}

          {/* Submitting */}
          {state === 'submitting' && (
            <div className="flex flex-col items-center gap-3">
              <svg className="animate-spin" width="32" height="32" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#C89B2F" strokeWidth="2" strokeDasharray="32" strokeDashoffset="12" />
              </svg>
              <p className="text-sm text-yellow-400">Routing to Notion…</p>
            </div>
          )}

          {/* Success */}
          {state === 'success' && (
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: 'rgba(34,197,94,0.12)' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-sm text-green-400 text-center">{message}</p>
            </div>
          )}

          {/* Error */}
          {state === 'error' && (
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm text-red-400 text-center">{message}</p>
              <button onClick={reset} className="text-xs text-stone-500">Try again</button>
            </div>
          )}

          <button onClick={safeClose} className="text-xs text-stone-600">Cancel</button>
        </div>
      </div>
    </div>
  )
}
