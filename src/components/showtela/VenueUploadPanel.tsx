'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export function VenueUploadPanel({
  workspaceId,
}: {
  workspaceId: string
}) {
  const router = useRouter()
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isPending, startTransition] = useTransition()

  const submit = async () => {
    if (files.length === 0) {
      setError('Choose a venue packet before uploading.')
      return
    }

    setError(null)
    setMessage(null)

    const form = new FormData()
    form.set('workspaceId', workspaceId)
    for (const file of files) form.append('files', file)

    try {
      setIsUploading(true)
      const res = await fetch('/api/venue-intelligence/upload', {
        method: 'POST',
        body: form,
      })
      const data = await res.json() as { error?: string; venueName?: string; readinessScore?: number }
      if (!res.ok || data.error) throw new Error(data.error ?? `HTTP ${res.status}`)

      setFiles([])
      setMessage(`${data.venueName ?? 'Venue'} scored ${data.readinessScore ?? 0}.`)
      startTransition(() => {
        router.refresh()
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <section className="rounded-[30px] border border-[#DED4C4] bg-[linear-gradient(180deg,#FBF8F1_0%,#F3ECDF_100%)] p-6 shadow-[0_18px_40px_rgba(17,17,17,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9A7C46]">Upload</p>
          <h2 className="mt-2 text-[26px] font-semibold tracking-[-0.03em] text-[#171411]">Venue Intelligence v1</h2>
          <p className="mt-3 max-w-[48ch] text-[14px] leading-[1.65] text-[#6E6A63]">
            Upload a venue technical packet and ShowTELA will extract the venue profile, compare it to the active production rider, save the result, and surface readiness.
          </p>
        </div>
        <div className="rounded-full border border-[#D9CDB8] bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7C6A53]">
          No automation
        </div>
      </div>

      <div className="mt-6 rounded-[24px] border border-dashed border-[#CDBB9E] bg-white/70 p-5">
        <label className="block text-[12px] font-semibold uppercase tracking-[0.16em] text-[#6B5D4B]">
          Venue Packet
          <input
            type="file"
            multiple
            accept=".pdf,.txt,.md,.markdown,text/plain,application/pdf"
            onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
            className="mt-3 block w-full rounded-[18px] border border-[#DED4C4] bg-white px-4 py-3 text-[13px] text-[#171411] file:mr-3 file:rounded-full file:border-0 file:bg-[#171411] file:px-3 file:py-2 file:text-[12px] file:font-semibold file:text-[#F6EFDF]"
          />
        </label>
        <p className="mt-3 text-[12px] leading-[1.6] text-[#857766]">
          Supports PDF and text-based packets. The active rider is loaded from Supabase and falls back to the checked-in proof rider if no active rider exists yet.
        </p>
        {files.length > 0 ? (
          <p className="mt-3 text-[12px] font-medium text-[#5B5145]">
            {files.length} file{files.length === 1 ? '' : 's'} staged: {files.map((file) => file.name).join(', ')}
          </p>
        ) : null}
        {error ? <p className="mt-3 text-[12px] font-medium text-[#8A3B2A]">{error}</p> : null}
        {message ? <p className="mt-3 text-[12px] font-medium text-[#506345]">{message}</p> : null}
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={() => void submit()}
            disabled={isPending || isUploading}
            className="rounded-full bg-[#171411] px-5 py-3 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#F7F3EC] transition-opacity disabled:opacity-50"
          >
            {isUploading ? 'Extracting…' : isPending ? 'Refreshing…' : 'Extract And Compare'}
          </button>
        </div>
      </div>
    </section>
  )
}
