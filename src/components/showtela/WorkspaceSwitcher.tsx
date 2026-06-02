'use client'

import Link from 'next/link'
import { useState } from 'react'

type ShowTelaEntry = {
  showTelaId: string
  showTelaName: string
}

export function WorkspaceSwitcher({
  currentShowTelaId,
  currentShowTelaName,
  activeShowTelas,
}: {
  currentShowTelaId?: string
  currentShowTelaName?: string
  activeShowTelas: ShowTelaEntry[]
}) {
  const [open, setOpen] = useState(false)

  const others = activeShowTelas.filter((s) => s.showTelaId !== currentShowTelaId)

  return (
    <div className="mb-6 rounded-[24px] border border-[#E2D7C7] bg-white px-5 py-4 shadow-[0_8px_20px_rgba(17,17,17,0.05)]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3"
      >
        <div className="text-left">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8E7551]">ShowTELA</p>
          <p className="mt-1 text-[16px] font-semibold tracking-[-0.02em] text-[#171411]">
            {currentShowTelaName ?? 'Unnamed ShowTELA'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeShowTelas.length > 1 && (
            <span className="rounded-full border border-[#E7DCCB] bg-[#FBF7F0] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7A6240]">
              {activeShowTelas.length}
            </span>
          )}
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
          >
            <path d="M4 6l4 4 4-4" stroke="#A89880" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="mt-4 space-y-1 border-t border-[#F0E8DD] pt-4">
          {others.length > 0 && (
            <>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#A89880]">Switch to</p>
              {others.map((entry) => (
                <Link
                  key={entry.showTelaId}
                  href={`/showtela?showtela=${encodeURIComponent(entry.showTelaId)}`}
                  className="flex items-center justify-between rounded-[14px] px-3 py-3 hover:bg-[#FAF7F2]"
                  onClick={() => setOpen(false)}
                >
                  <span className="text-[14px] font-medium text-[#171411]">{entry.showTelaName}</span>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 7h8M8 4l3 3-3 3" stroke="#C89B2F" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              ))}
              <div className="h-px bg-[#F0E8DD] my-2" />
            </>
          )}
          <Link
            href="/"
            className="flex items-center gap-2 rounded-[14px] px-3 py-3 hover:bg-[#FAF7F2]"
            onClick={() => setOpen(false)}
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#C89B2F]">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M5 1v8M1 5h8" stroke="#0D0E12" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </div>
            <span className="text-[14px] font-medium text-[#171411]">Create ShowTELA</span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 rounded-[14px] px-3 py-3 hover:bg-[#FAF7F2]"
            onClick={() => setOpen(false)}
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full border border-[#E0D5C5] bg-[#F8F4EE]">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1 2.5h8M1 5h6M1 7.5h4" stroke="#9A7C46" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </div>
            <span className="text-[14px] font-medium text-[#171411]">Manage ShowTELAs</span>
          </Link>
        </div>
      )}
    </div>
  )
}
