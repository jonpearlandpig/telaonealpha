'use client'
import { useState, useRef } from 'react'

type Mode = 'voice' | 'text' | 'upload' | 'paste'
type Status = 'idle' | 'recording' | 'submitting' | 'done' | 'error'

type Props = {
  submittedBy?: string
  taggedPerson?: string
  onClose: () => void
  onSuccess?: (message: string) => void
}

const MODE_LABELS: Record<Mode, string> = {
  voice: 'Voice',
  text: 'Text',
  upload: 'Upload',
  paste: 'Quick Paste',
}

export function ContinuityIngest({ submittedBy, taggedPerson, onClose, onSuccess }: Props) {
  const [mode, setMode] = useState<Mode>('text')
  const [text, setText] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  async function submitTranscript(transcript: string) {
    setStatus('submitting')
    try {
      const res = await fetch('/api/pearl-drop-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, submittedBy: submittedBy ?? 'Unknown', taggedPerson: taggedPerson ?? '' }),
      })
      const data = await res.json() as { message?: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Submission failed')
      setMessage(data.message ?? 'Captured')
      setStatus('done')
      onSuccess?.(data.message ?? 'Captured')
    } catch (err) {
      setMessage(String(err))
      setStatus('error')
    }
  }

  async function startRecording() {
    chunksRef.current = []
    setStatus('recording')
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const recorder = new MediaRecorder(stream)
    mediaRef.current = recorder
    recorder.ondataavailable = (e) => chunksRef.current.push(e.data)
    recorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop())
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      const fd = new FormData()
      fd.append('audio', blob, 'recording.webm')
      setStatus('submitting')
      const res = await fetch('/api/transcribe-audio', { method: 'POST', body: fd })
      const data = await res.json() as { transcript?: string; error?: string }
      if (!res.ok || !data.transcript) { setMessage(data.error ?? 'Transcription failed'); setStatus('error'); return }
      await submitTranscript(data.transcript)
    }
    recorder.start()
  }

  function stopRecording() {
    mediaRef.current?.stop()
  }

  async function handleFile(file: File) {
    setStatus('submitting')
    const reader = new FileReader()
    reader.onload = async () => {
      const content = reader.result as string
      const lines = content.split('\n').filter(Boolean).slice(0, 40).join('\n')
      await submitTranscript(`[Uploaded: ${file.name}]\n${lines}`)
    }
    reader.readAsText(file)
  }

  async function handlePaste() {
    try {
      const t = await navigator.clipboard.readText()
      if (!t.trim()) { setMessage('Clipboard is empty'); setStatus('error'); return }
      setText(t)
    } catch {
      setMessage('Clipboard access denied — paste manually')
      setStatus('error')
    }
  }

  const isSubmitting = status === 'submitting'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ backgroundColor: 'rgba(20,18,16,0.55)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-sm rounded-t-[28px] bg-[#F8F6F2] px-5 pb-8 pt-5 shadow-2xl">
        {/* Handle */}
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#D4C9B4]" />

        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-[#141210]">Add to Continuity</h2>
          <button onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded-full bg-[#EAE4DA] text-[#5E5348]">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Mode tabs */}
        <div className="mb-4 flex gap-1 rounded-[14px] bg-[#EAE4DA] p-1">
          {(Object.keys(MODE_LABELS) as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="flex-1 rounded-[10px] py-1.5 text-[11px] font-semibold transition-all"
              style={{
                backgroundColor: mode === m ? '#141210' : 'transparent',
                color: mode === m ? '#F8E1B0' : '#8B847B',
              }}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>

        {/* Mode content */}
        {status === 'done' && (
          <div className="py-6 text-center">
            <p className="text-[13px] font-semibold text-[#141210]">{message}</p>
            <button onClick={onClose} className="mt-4 rounded-full bg-[#141210] px-6 py-2 text-[12px] font-semibold text-[#F8E1B0]">Done</button>
          </div>
        )}

        {status === 'error' && (
          <div className="mb-3 rounded-xl bg-[#F8717118] px-3 py-2">
            <p className="text-[11px] text-[#F87171]">{message}</p>
          </div>
        )}

        {status !== 'done' && (
          <>
            {mode === 'text' && (
              <div className="flex flex-col gap-3">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="What needs to be captured?"
                  className="h-28 w-full resize-none rounded-[14px] bg-white px-4 py-3 text-[13px] text-[#141210] placeholder:text-[#A89880] outline-none border border-[#EAE4DA] focus:border-[#C89B2F]"
                />
                <button
                  disabled={!text.trim() || isSubmitting}
                  onClick={() => submitTranscript(text)}
                  className="w-full rounded-full py-3 text-[13px] font-semibold transition-opacity disabled:opacity-40"
                  style={{ backgroundColor: '#141210', color: '#F8E1B0' }}
                >
                  {isSubmitting ? 'Capturing…' : 'Add to Continuity'}
                </button>
              </div>
            )}

            {mode === 'voice' && (
              <div className="flex flex-col items-center gap-4 py-4">
                {status === 'recording' ? (
                  <>
                    <div className="h-16 w-16 rounded-full bg-[#F87171] flex items-center justify-center" style={{ animation: 'subtlePulse 1.2s ease-in-out infinite' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <rect x="9" y="4" width="6" height="6" rx="1" fill="white"/>
                      </svg>
                    </div>
                    <p className="text-[12px] text-[#5E5348]">Recording… tap to stop</p>
                    <button onClick={stopRecording} className="rounded-full border border-[#EAE4DA] px-6 py-2 text-[12px] font-semibold text-[#141210]">Stop</button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={startRecording}
                      disabled={isSubmitting}
                      className="h-16 w-16 rounded-full bg-[#141210] flex items-center justify-center disabled:opacity-40"
                    >
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" fill="#C89B2F"/>
                        <path d="M19 10a7 7 0 0 1-14 0" stroke="#C89B2F" strokeWidth="1.8" strokeLinecap="round"/>
                        <path d="M12 19v3" stroke="#C89B2F" strokeWidth="1.8" strokeLinecap="round"/>
                      </svg>
                    </button>
                    <p className="text-[12px] text-[#8B847B]">{isSubmitting ? 'Transcribing…' : 'Tap to record'}</p>
                  </>
                )}
              </div>
            )}

            {mode === 'upload' && (
              <div className="flex flex-col gap-3">
                <input ref={fileRef} type="file" accept=".txt,.md,.pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={isSubmitting}
                  className="w-full rounded-[14px] border-2 border-dashed border-[#D4C9B4] py-8 text-center disabled:opacity-40"
                >
                  <p className="text-[13px] font-semibold text-[#5E5348]">{isSubmitting ? 'Processing…' : 'Tap to upload'}</p>
                  <p className="mt-1 text-[11px] text-[#A89880]">TXT, Markdown, PDF</p>
                </button>
              </div>
            )}

            {mode === 'paste' && (
              <div className="flex flex-col gap-3">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste content here…"
                  className="h-28 w-full resize-none rounded-[14px] bg-white px-4 py-3 text-[13px] text-[#141210] placeholder:text-[#A89880] outline-none border border-[#EAE4DA] focus:border-[#C89B2F]"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handlePaste}
                    className="flex-1 rounded-full border border-[#EAE4DA] py-3 text-[12px] font-semibold text-[#5E5348]"
                  >
                    Paste from clipboard
                  </button>
                  <button
                    disabled={!text.trim() || isSubmitting}
                    onClick={() => submitTranscript(text)}
                    className="flex-1 rounded-full py-3 text-[12px] font-semibold disabled:opacity-40"
                    style={{ backgroundColor: '#141210', color: '#F8E1B0' }}
                  >
                    {isSubmitting ? 'Capturing…' : 'Capture'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <style>{`
        @keyframes subtlePulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.85; }
        }
      `}</style>
    </div>
  )
}
