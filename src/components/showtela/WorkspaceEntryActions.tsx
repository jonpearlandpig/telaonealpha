'use client'

import { useState } from 'react'

type Props = {
  showTelaId: string
  showTelaName: string
}

export function WorkspaceEntryActions({ showTelaId, showTelaName }: Props) {
  const [mode, setMode] = useState<null | 'rename' | 'delete'>(null)

  if (mode === 'rename') {
    return (
      <form
        action="/showtela/rename"
        method="post"
        className="flex flex-col gap-2"
        onSubmit={() => setMode(null)}
      >
        <input type="hidden" name="showTelaId" value={showTelaId} />
        <input
          name="showTelaName"
          defaultValue={showTelaName}
          autoFocus
          placeholder="New ShowTELA name"
          className="w-full rounded-[16px] border border-[#D7CCBE] bg-[#F8F6F2] px-3 py-2.5 text-[14px] text-[#171411] outline-none placeholder:text-[#A89880] focus:border-[#C89B2F]"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 rounded-full bg-[#C89B2F] px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#0D0E12]"
          >
            Rename
          </button>
          <button
            type="button"
            onClick={() => setMode(null)}
            className="rounded-full border border-[#D7CCBE] px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#8B847B]"
          >
            Cancel
          </button>
        </div>
      </form>
    )
  }

  if (mode === 'delete') {
    return (
      <form
        action="/showtela/delete"
        method="post"
        className="flex flex-col gap-2"
        onSubmit={() => setMode(null)}
      >
        <input type="hidden" name="showTelaId" value={showTelaId} />
        <p className="text-[12px] leading-[1.5] text-[#D97357]">
          Type <strong>{showTelaName}</strong> to permanently delete this ShowTELA and all associated data.
        </p>
        <input
          name="confirmName"
          autoFocus
          placeholder={showTelaName}
          className="w-full rounded-[16px] border border-[#E5B5A5] bg-[#FDF2EF] px-3 py-2.5 text-[14px] text-[#171411] outline-none placeholder:text-[#D7B0A5] focus:border-[#D97357]"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 rounded-full bg-[#D63737] px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-white"
          >
            Delete Forever
          </button>
          <button
            type="button"
            onClick={() => setMode(null)}
            className="rounded-full border border-[#D7CCBE] px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#8B847B]"
          >
            Cancel
          </button>
        </div>
      </form>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => setMode('rename')}
        className="inline-flex rounded-full border border-[#D7CCBE] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7A6240]"
      >
        Rename
      </button>
      <button
        type="button"
        onClick={() => setMode('delete')}
        className="inline-flex rounded-full border border-[#E5B5A5] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#D63737]"
      >
        Delete
      </button>
    </div>
  )
}
