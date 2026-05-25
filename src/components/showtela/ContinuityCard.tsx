'use client'

import { useState } from 'react'
import type { ContinuityEvent } from '@/lib/showtela/types'
import { getPressureStyles } from '@/lib/showtela/getPressureStyles'

export function ContinuityCard({ item }: { item: ContinuityEvent }) {
  const [showTranscript, setShowTranscript] = useState(false)
  const styles = getPressureStyles(item.pressure)
  const summary = item.summary ?? item.body ?? ''

  return (
    <article className={`rounded-[1.35rem] border p-4 shadow-[0_18px_34px_rgba(24,19,13,0.11)] ${styles.panel}`}>
      <div className="flex flex-wrap items-center gap-2">
        {item.pressure ? (
          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${styles.badge}`}>
            {item.pressure}
          </span>
        ) : null}
        {item.classification ? (
          <span className="rounded-full border border-[#DCCDB2] bg-white/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6D5834]">
            {item.classification}
          </span>
        ) : null}
      </div>

      <h3 className="mt-3 text-[15px] font-semibold leading-tight text-[#18150F]">{item.headline}</h3>

      {summary ? (
        <p className="mt-2 text-sm leading-relaxed text-[#5E5142]">{summary}</p>
      ) : null}

      {item.nextActions?.length ? (
        <div className="mt-3 rounded-[18px] border border-[#E6D9C5] bg-white/55 px-3 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8A7049]">Next actions</p>
          <div className="mt-2 space-y-1.5">
            {item.nextActions.slice(0, 3).map((action) => (
              <p key={action} className="text-[12px] leading-relaxed text-[#5E5142]">
                {action}
              </p>
            ))}
          </div>
        </div>
      ) : null}

      {item.rawTranscript ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowTranscript((current) => !current)}
            className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8A7049]"
          >
            {showTranscript ? 'Hide transcript' : 'See transcript'}
          </button>
          {showTranscript ? (
            <p className="mt-2 rounded-[16px] border border-[#E4D8C5] bg-[#FFFDF9] px-3 py-3 text-[12px] leading-relaxed text-[#6A5A46]">
              {item.rawTranscript}
            </p>
          ) : null}
        </div>
      ) : null}

      <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.14em] text-[#8A7049]">
        {item.owner?.name ?? 'Unknown'} • {item.timestamp ?? ''}
      </p>
    </article>
  )
}
