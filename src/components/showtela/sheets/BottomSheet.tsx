'use client'
import { useEffect } from 'react'

export function BottomSheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative mx-auto w-full max-w-[430px] rounded-t-[28px] bg-[#F8F6F2] shadow-[0_-8px_40px_rgba(0,0,0,0.18)] md:max-w-[680px] xl:max-w-[760px]">
        <div className="flex items-center justify-between border-b border-[#EAE4DA] px-5 py-4">
          <div className="h-1 w-10 rounded-full bg-[#D4C9B4] absolute top-3 left-1/2 -translate-x-1/2" />
          <h2 className="mt-2 text-[16px] font-semibold text-[#141210]">{title}</h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-black/8 text-[#5E5348]">✕</button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4 pb-12">
          {children}
        </div>
      </div>
    </div>
  )
}
