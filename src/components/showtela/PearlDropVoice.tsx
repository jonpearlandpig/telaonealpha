'use client'
import { useState, useRef } from 'react'

type State = 'idle' | 'listening' | 'processing' | 'success' | 'error'

export function PearlDropVoice({ onClose }: { onClose: () => void }) {
  const [state, setState] = useState<State>('idle')
  const [transcript, setTranscript] = useState('')
  const [message, setMessage] = useState('')
  const recognitionRef = useRef<unknown>(null)

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setState('error')
      setMessage('Voice not supported in this browser. Try Chrome.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognitionRef.current = recognition

    recognition.onresult = (event) => {
      const t = Array.from(event.results).map((r) => r[0].transcript).join('')
      setTranscript(t)
    }

    recognition.onend = () => {
      if (transcript.trim()) {
        submit(transcript)
      } else {
        setState('idle')
      }
    }

    recognition.onerror = () => {
      setState('error')
      setMessage('Could not hear anything. Try again.')
    }

    recognition.start()
    setState('listening')
  }

  const stopListening = () => {
    recognitionRef.current?.stop()
  }

  const submit = async (text: string) => {
    setState('processing')
    try {
      const res = await fetch('/api/pearl-drop-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text }),
      })
      const data = await res.json() as { message?: string; error?: string }
      if (data.error) throw new Error(data.error)
      setState('success')
      setMessage(data.message ?? 'Saved to Notion')
      setTimeout(onClose, 2000)
    } catch {
      setState('error')
      setMessage('Failed to save. Try again.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[4px]" onClick={onClose}>
      <div className="relative mx-4 w-full max-w-[340px] overflow-hidden rounded-[28px] bg-[#141210] p-8 shadow-[0_24px_64px_rgba(0,0,0,0.40)]" onClick={(e) => e.stopPropagation()}>
        {/* Glow */}
        <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(200,155,47,0.20),transparent_60%)]" />

        <div className="relative flex flex-col items-center gap-6">
          {/* Title */}
          <div className="text-center">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#C89B2F]">Pearl Drop</p>
            <p className="mt-1 text-[13px] text-[#8B847B]">Speak to update Notion</p>
          </div>

          {/* Mic button */}
          <button
            onMouseDown={startListening}
            onMouseUp={stopListening}
            onTouchStart={startListening}
            onTouchEnd={stopListening}
            disabled={state === 'processing' || state === 'success'}
            className="relative flex h-24 w-24 items-center justify-center rounded-full transition-all active:scale-95"
            style={{
              background: state === 'listening'
                ? 'radial-gradient(circle, #F87171, #DC2626)'
                : 'radial-gradient(circle, #D8A928, #C89B2F)',
              boxShadow: state === 'listening'
                ? '0 0 0 12px rgba(248,113,113,0.20), 0 0 0 24px rgba(248,113,113,0.08)'
                : '0 0 0 8px rgba(200,155,47,0.20)',
            }}
          >
            {state === 'processing' ? (
              <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2" strokeDasharray="32" strokeDashoffset="12"/>
              </svg>
            ) : state === 'success' ? (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <rect x="9" y="2" width="6" height="12" rx="3" fill="white"/>
                <path d="M5 10a7 7 0 0014 0" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                <path d="M12 19v3" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            )}
          </button>

          {/* Status */}
          <div className="text-center">
            {state === 'idle' && <p className="text-[13px] text-[#8B847B]">Hold to speak</p>}
            {state === 'listening' && <p className="text-[13px] text-[#F87171]">Listening... release when done</p>}
            {state === 'processing' && <p className="text-[13px] text-[#C89B2F]">Routing to Notion...</p>}
            {state === 'success' && <p className="text-[13px] text-[#4ADE80]">{message}</p>}
            {state === 'error' && <p className="text-[13px] text-[#F87171]">{message}</p>}
          </div>

          {/* Transcript */}
          {transcript && (
            <div className="w-full rounded-[14px] bg-white/8 px-4 py-3">
              <p className="text-center text-[12px] italic text-[#B8A88A]">&ldquo;{transcript}&rdquo;</p>
            </div>
          )}

          {/* Examples */}
          {state === 'idle' && (
            <div className="w-full space-y-1.5">
              {[
                'Potential lighting designer, Marcus Webb, 615-555-0192',
                'Unresolved — Juan hasn\'t confirmed stage plot',
                'Feed update — bus call moved to 8:50 AM',
              ].map((ex) => (
                <button key={ex} onClick={() => submit(ex)} className="w-full rounded-[10px] bg-white/6 px-3 py-2 text-left text-[11px] text-[#8B847B]">
                  &ldquo;{ex}&rdquo;
                </button>
              ))}
            </div>
          )}

          <button onClick={onClose} className="text-[11px] text-[#5E5348]">Cancel</button>
        </div>
      </div>
    </div>
  )
}
