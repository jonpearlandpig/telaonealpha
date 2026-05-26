import type { UnresolvedPressure } from './types'
import type { OperationalProjection } from '@/lib/runtime/state/model'

export function UnresolvedPressureCard({
  pressure,
  projection,
  onOpen,
}: {
  pressure: UnresolvedPressure
  projection?: OperationalProjection
  onOpen?: () => void
}) {
  const total = pressure.unresolvedCount
  const hasProjection = Boolean(projection)
  if (total === 0 && !hasProjection) return null
  const high = projection?.groupedTopology.blockers ?? pressure.overdueCount
  const medium = projection?.groupedTopology.movement ?? (pressure.blockedCount + pressure.pendingApprovals)
  const ready = projection?.groupedTopology.readiness ?? 0

  return (
    <section className="px-5 pb-7 pt-1">
      <article className="relative overflow-hidden rounded-[22px] bg-[#2A2316] px-6 py-5 shadow-[0_12px_32px_rgba(32,25,15,0.14)]">
        <span className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#C89B2F]/20 blur-2xl" />
        <span className="pointer-events-none absolute -left-6 bottom-0 h-20 w-20 rounded-full bg-[#C89B2F]/12 blur-xl" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#C89B2F]/40 bg-[#C89B2F]/08">
              <span className="text-[18px] text-[#D0A73A]">⚡</span>
            </div>
            <div>
              <p className="text-[15px] font-semibold text-[#F6EEDB]">{hasProjection ? 'Operational projection' : `${total} unresolved`}</p>
              <p className="text-[12px] text-[#B8A88A]">
                {high > 0 ? `${high} blocker${high === 1 ? '' : 's'}` : ''}{high > 0 && medium > 0 ? ' · ' : ''}{medium > 0 ? `${medium} moving` : ''}{(high > 0 || medium > 0) && ready > 0 ? ' · ' : ''}{ready > 0 ? `${ready} ready` : ''}{high === 0 && medium === 0 && ready === 0 ? 'Field calm' : ''}
              </p>
            </div>
          </div>
          <button onClick={onOpen} className="flex items-center gap-1 rounded-full border border-white/18 bg-white/8 px-4 py-2 text-[12px] font-medium text-[#F6EEDB] backdrop-blur">
            Surface ›
          </button>
        </div>
      </article>
    </section>
  )
}
