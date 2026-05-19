import type { UnresolvedPressure } from './types'

export function UnresolvedPressureCard({ pressure, onOpen }: { pressure: UnresolvedPressure; onOpen?: () => void }) {
  const total = pressure.unresolvedCount
  if (total === 0) return null
  const high = pressure.overdueCount
  const medium = pressure.blockedCount + pressure.pendingApprovals

  return (
    <section className="px-5 pb-4">
      <article className="relative overflow-hidden rounded-[20px] bg-[#1B1713] px-5 py-4 shadow-[0_12px_32px_rgba(200,155,47,0.14)]">
        <span className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#C89B2F]/20 blur-2xl" />
        <span className="pointer-events-none absolute -left-6 bottom-0 h-20 w-20 rounded-full bg-[#C89B2F]/12 blur-xl" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#C89B2F]/40 bg-[#C89B2F]/15">
              <span className="text-[16px]">⚡</span>
            </div>
            <div>
              <p className="text-[14px] font-semibold text-[#F6EEDB]">{total} item{total !== 1 ? 's' : ''} need attention</p>
              <p className="text-[11px] text-[#B8A88A]">
                {high > 0 ? `${high} high` : ''}{high > 0 && medium > 0 ? ' · ' : ''}{medium > 0 ? `${medium} medium pressure` : ''}{high === 0 && medium === 0 ? 'Review continuity' : ''}
              </p>
            </div>
          </div>
          <button onClick={onOpen} className="flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-medium text-[#F6EEDB] backdrop-blur">
            Open ›
          </button>
        </div>
      </article>
    </section>
  )
}
