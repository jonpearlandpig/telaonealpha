'use client'

import { PresenceLogo } from './presence/PresenceLogo'
import type { ContinuityIngestionMode } from '@/lib/continuity/normalize-ingestion'

export function OpeningSurface({
  user,
  onOpenIngest,
}: {
  user?: { name: string; email: string; image: string }
  onOpenIngest: (mode?: ContinuityIngestionMode | null) => void
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
      </div>

      {/* Profile + */}
      <div className="relative z-10 mt-16 flex flex-col items-center">
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
            aria-label="Begin continuity ingestion"
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
          operational origin node
        </p>
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
