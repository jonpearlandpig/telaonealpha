'use client'

import { PresenceLogo } from './presence/PresenceLogo'
import type { ContinuityIngestionMode } from '@/lib/continuity/normalize-ingestion'

export function OpeningSurface({
  user,
  onOpenIngest,
  showTelaName,
  creationSummary,
}: {
  user?: { name: string; email: string; image: string }
  onOpenIngest: (mode?: ContinuityIngestionMode | null) => void
  showTelaName?: string
  creationSummary?: {
    people: number
    operations: number
    calendar: number
    artifacts: number
    events: number
  } | null
}) {
  const initial = user?.name?.slice(0, 1) ?? 'S'
  const displayName = user?.name?.split(' ')[0] ?? 'Operator'

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col items-center justify-center"
      style={{ backgroundColor: '#0D0E12' }}
    >
      {/* Ambient radial atmosphere */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 52% at 50% 40%, rgba(200,155,47,0.07) 0%, transparent 70%)',
        }}
      />

      {/* Presence Logo */}
      <div className="relative z-10 flex flex-col items-center">
        <PresenceLogo state="idle" size={148} />
        <p
          className="mt-5 text-[10px] font-semibold uppercase tracking-[0.26em]"
          style={{ color: 'rgba(200,155,47,0.52)' }}
        >
          ShowTELA
        </p>
        <h1 className="mt-4 max-w-[10ch] text-center text-[36px] font-semibold leading-[0.98] tracking-[-0.04em]" style={{ color: '#F8F6F2' }}>
          Ready.
        </h1>
        <p className="mt-3 max-w-[28ch] text-center text-[13px] leading-[1.6]" style={{ color: 'rgba(248,246,242,0.68)' }}>
          Nothing is saved yet. Add the first update when the show starts moving.
        </p>
      </div>

      {/* Profile + */}
      <div className="relative z-10 mt-16 flex flex-col items-center">
        {creationSummary ? (
          <div
            className="mb-8 w-[min(92vw,420px)] rounded-[28px] border px-5 py-5 text-left shadow-[0_18px_40px_rgba(0,0,0,0.22)]"
            style={{
              borderColor: 'rgba(200,155,47,0.24)',
              background: 'linear-gradient(180deg, rgba(28,31,37,0.98) 0%, rgba(17,18,23,0.98) 100%)',
            }}
          >
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: 'rgba(200,155,47,0.74)' }}
            >
              ShowTELA Created
            </p>
            <p className="mt-2 text-[22px] font-semibold tracking-[-0.03em]" style={{ color: '#F8F6F2' }}>
              {showTelaName ?? 'New ShowTELA'}
            </p>
            <p className="mt-2 text-[12px] leading-[1.6]" style={{ color: 'rgba(248,246,242,0.72)' }}>
              Clean state verified. Open and ready for updates.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-[11px]">
              <div className="rounded-[16px] px-3 py-3" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                <p style={{ color: 'rgba(200,155,47,0.74)' }}>People</p>
                <p className="mt-1 font-semibold" style={{ color: '#F8F6F2' }}>{creationSummary.people}</p>
              </div>
              <div className="rounded-[16px] px-3 py-3" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                <p style={{ color: 'rgba(200,155,47,0.74)' }}>Operations</p>
                <p className="mt-1 font-semibold" style={{ color: '#F8F6F2' }}>{creationSummary.operations}</p>
              </div>
              <div className="rounded-[16px] px-3 py-3" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                <p style={{ color: 'rgba(200,155,47,0.74)' }}>Calendar</p>
                <p className="mt-1 font-semibold" style={{ color: '#F8F6F2' }}>{creationSummary.calendar}</p>
              </div>
              <div className="rounded-[16px] px-3 py-3" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                <p style={{ color: 'rgba(200,155,47,0.74)' }}>Files</p>
                <p className="mt-1 font-semibold" style={{ color: '#F8F6F2' }}>{creationSummary.artifacts}</p>
              </div>
              <div className="rounded-[16px] px-3 py-3" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                <p style={{ color: 'rgba(200,155,47,0.74)' }}>Events</p>
                <p className="mt-1 font-semibold" style={{ color: '#F8F6F2' }}>{creationSummary.events}</p>
              </div>
              <div className="rounded-[16px] px-3 py-3" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                <p style={{ color: 'rgba(200,155,47,0.74)' }}>Status</p>
                <p className="mt-1 font-semibold" style={{ color: '#F8F6F2' }}>Clean</p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="relative">
          <div
            className="h-[76px] w-[76px] overflow-hidden rounded-full"
            style={{
              border: '1px solid rgba(200,155,47,0.22)',
              backgroundColor: '#1A1C22',
            }}
          >
            {user?.image ? (
              <img src={user.image} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center text-[26px] font-semibold"
                style={{ color: 'rgba(200,155,47,0.65)' }}
              >
                {initial}
              </div>
            )}
          </div>
          <button
            onClick={() => onOpenIngest(null)}
            aria-label="Add first update"
            className="absolute -bottom-1 -right-1 flex h-[28px] w-[28px] items-center justify-center rounded-full transition-opacity hover:opacity-90 active:opacity-75"
            style={{
              backgroundColor: '#C89B2F',
              border: '2px solid #0D0E12',
              boxShadow: '0 2px 12px rgba(200,155,47,0.40)',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path
                d="M5.5 1v9M1 5.5h9"
                stroke="#0D0E12"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <p
          className="mt-4 text-[14px] font-semibold"
          style={{ color: '#F8F6F2' }}
        >
          {displayName}
        </p>
        <p
          className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.18em]"
          style={{ color: 'rgba(200,155,47,0.36)' }}
        >
          {creationSummary ? 'ready for updates' : 'ready to begin'}
        </p>
        {!creationSummary && (
          <div
            className="mt-5 grid w-[min(86vw,340px)] grid-cols-4 gap-2 rounded-[22px] border px-3 py-3"
            style={{ borderColor: 'rgba(200,155,47,0.16)', backgroundColor: 'rgba(255,255,255,0.035)' }}
          >
            {['Home', 'Play', 'Memory', 'Calendar'].map((label) => (
              <div key={label} className="text-center">
                <p className="text-[9px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'rgba(200,155,47,0.52)' }}>{label}</p>
                <p className="mt-1 text-[11px] font-semibold" style={{ color: 'rgba(248,246,242,0.78)' }}>Ready</p>
              </div>
            ))}
          </div>
        )}
        {showTelaName ? (
          <p
            className="mt-3 text-[16px] font-semibold tracking-[-0.03em]"
            style={{ color: '#F8F6F2' }}
          >
            {showTelaName}
          </p>
        ) : null}
      </div>

      {/* Upload suggestions */}
      <div className="relative z-10 mt-10 w-full max-w-[340px] px-5">
        <p
          className="mb-4 text-center text-[11px] font-semibold uppercase tracking-[0.22em]"
          style={{ color: 'rgba(200,155,47,0.52)' }}
        >
          Upload your first document
        </p>
        <div className="flex flex-col gap-2">
          {[
            { label: 'Anchor Directory', detail: 'People, roles, and contacts' },
            { label: 'Tour Calendar', detail: 'Dates, venues, and schedule' },
            { label: 'Production Rider', detail: 'Tech, hospitality, and logistics' },
          ].map(({ label, detail }) => (
            <button
              key={label}
              onClick={() => onOpenIngest('upload-files')}
              className="flex items-center justify-between rounded-[18px] px-4 py-3.5 text-left transition-opacity hover:opacity-90 active:opacity-75"
              style={{
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(200,155,47,0.14)',
              }}
            >
              <div>
                <p className="text-[14px] font-semibold" style={{ color: '#F8F6F2' }}>{label}</p>
                <p className="mt-0.5 text-[11px]" style={{ color: 'rgba(200,155,47,0.48)' }}>{detail}</p>
              </div>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ opacity: 0.4 }}>
                <path d="M3 7h8M7 3l4 4-4 4" stroke="#C89B2F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
