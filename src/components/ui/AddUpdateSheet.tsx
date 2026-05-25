'use client'

import { useState } from 'react'

export function AddUpdateSheet({
  open,
  onClose,
  onSubmit,
  isSubmitting = false,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (value: string) => Promise<void> | void
  isSubmitting?: boolean
}) {
  const [draft, setDraft] = useState('')

  if (!open) return null

  async function handleSubmit() {
    const value = draft.trim()
    if (!value || isSubmitting) return
    await onSubmit(value)
    setDraft('')
    onClose()
  }

  return <div className='fixed inset-0 z-50 bg-black/20' onClick={onClose}><div onClick={(e)=>e.stopPropagation()} className='absolute bottom-0 left-0 right-0 mx-auto max-w-[460px] rounded-t-[32px] bg-white p-6 space-y-3'>
    <h2 className='text-xl'>Add Update</h2><textarea value={draft} onChange={(event)=>setDraft(event.target.value)} className='w-full min-h-24 rounded-2xl border border-[var(--border)] p-3' placeholder='Capture operational continuity…' />
    <div className='grid grid-cols-2 gap-2 text-sm'>{['Canonical ingest','LLM summary','Transcript preserved','Runtime safe'].map((f)=><div key={f} className='flex min-h-11 items-center justify-center rounded-xl border border-[var(--border)] px-3 text-center text-[#5E5348]'>{f}</div>)}</div>
    <button disabled={isSubmitting || !draft.trim()} onClick={handleSubmit} className='w-full min-h-11 rounded-full bg-[var(--text-primary)] text-white disabled:opacity-60'>{isSubmitting ? 'Posting…' : 'Post Update'}</button>
  </div></div>
}
