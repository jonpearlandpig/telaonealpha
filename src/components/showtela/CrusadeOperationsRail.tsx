import type { OperationEntity, UnresolvedItem } from './types'

const OP_IMAGES: Record<string, string> = {
  venues:      'https://images.unsplash.com/photo-1503095396549-807759245b35?w=900&q=80',
  hospitality: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=900&q=80',
  travel:      'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=900&q=80',
  logistics:   'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900&q=80',
  security:    'https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=900&q=80',
  marketing:   'https://images.unsplash.com/photo-1557838923-2985c318be48?w=900&q=80',
  production:  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=900&q=80',
  touring:     'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=900&q=80',
}
const OP_FALLBACKS = [
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=900&q=80',
  'https://images.unsplash.com/photo-1464375117522-1311dd6a1f0a?w=900&q=80',
  'https://images.unsplash.com/photo-1503095396549-807759245b35?w=900&q=80',
  'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=900&q=80',
]

function resolveImage(item: OperationEntity): string {
  if (item.image) return item.image
  const key = (item.label ?? item.name ?? '').toLowerCase()
  const matched = Object.entries(OP_IMAGES).find(([k]) => key.includes(k))
  if (matched) return matched[1]
  return OP_FALLBACKS[Math.abs((item.id.charCodeAt(0) ?? 0)) % OP_FALLBACKS.length]
}

function OperationCard({ item, matchedItems, onTap }: {
  item: OperationEntity
  matchedItems: UnresolvedItem[]
  onTap?: () => void
}) {
  const image = resolveImage(item)
  const unresolved = item.unresolvedCount ?? 0
  const dotColor = unresolved >= 2 ? '#F87171' : unresolved === 1 ? '#F59E0B' : '#4ADE80'
  const statusLabel = unresolved > 0 ? `${unresolved} open` : 'clear'
  const displayName = item.label || item.name
  const movement = item.latest ?? ''

  // Layer 3: most consequential unresolved item for this operation
  const firstBlocker = matchedItems.find(u => u.blocking)
  const topItem = firstBlocker ?? matchedItems[0] ?? null

  // Layer 4: next irreversible operational movement
  const actionLabel = firstBlocker
    ? 'Resolve blocker'
    : unresolved > 0
      ? `Review ${unresolved > 1 ? `${unresolved} open` : 'open item'}`
      : null

  const showIntelLayer = topItem !== null || actionLabel !== null

  return (
    <button
      onClick={onTap}
      className="relative w-full overflow-hidden rounded-[22px] text-left"
      style={{ height: '230px', boxShadow: '0 10px 48px rgba(0,0,0,0.30)' }}
    >
      {/* Background image — full bleed, operational place-memory */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />

      {/* Cinematic gradient — dark zone sized to contain all four layers */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to top, rgba(8,6,4,0.94) 0%, rgba(8,6,4,0.74) 50%, rgba(8,6,4,0.18) 68%, transparent 100%)' }}
      />

      {/* Layer 2 signal — status pill, top right */}
      <div className="absolute right-4 top-4">
        <span className="flex items-center gap-1.5 rounded-full bg-black/28 px-2.5 py-1 backdrop-blur-[6px]">
          <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ backgroundColor: dotColor }} />
          <span className="text-[10px] font-medium leading-none text-white/78">{statusLabel}</span>
        </span>
      </div>

      {/* Content zone — four-layer operational intelligence */}
      <div className="absolute bottom-0 left-0 right-0 px-5 pb-5">

        {/* Layer 2: Primary operational state */}
        <h3 className="text-[26px] font-semibold leading-tight tracking-[-0.4px] text-white">{displayName}</h3>
        {movement && (
          <p className="mt-1.5 line-clamp-1 text-[13px] leading-snug text-white/68">{movement}</p>
        )}

        {/* Layer 3 + 4: Secondary intelligence and action pathway */}
        {showIntelLayer && (
          <div className={`mt-3 flex items-center gap-3 ${topItem ? 'justify-between' : 'justify-end'}`}>
            {topItem && (
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                {topItem.blocking && (
                  <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#F87171]" />
                )}
                <span className="line-clamp-1 text-[11px] leading-none text-white/50">{topItem.title}</span>
              </div>
            )}
            {actionLabel && (
              <span className="flex-shrink-0 text-[12px] font-medium text-[#D8A742]">{actionLabel} →</span>
            )}
          </div>
        )}
      </div>
    </button>
  )
}

export function CrusadeOperationsRail({ items, unresolvedItems, onOperationTap }: {
  items: OperationEntity[]
  unresolvedItems?: UnresolvedItem[]
  onOperationTap?: (name: string) => void
}) {
  if (items.length === 0) {
    return (
      <section className="px-5 pb-6">
        <div className="rounded-[20px] border border-dashed border-[#D4C9B4] px-4 py-8 text-center">
          <p className="text-[13px] font-medium text-[#8B847B]">No operations yet.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="px-5 pb-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#5E5348]">Operations</h2>
        <button className="text-[11px] font-medium text-[#C89B2F]">View all</button>
      </div>
      <div className="flex flex-col gap-3.5">
        {items.map((item) => {
          const opKey = (item.label || item.name).toLowerCase()
          const matched = (unresolvedItems ?? []).filter(u =>
            u.operation
              ? u.operation.toLowerCase().includes(opKey) || opKey.includes(u.operation.toLowerCase())
              : false
          )
          return (
            <OperationCard
              key={item.id}
              item={item}
              matchedItems={matched}
              onTap={() => onOperationTap?.(item.label)}
            />
          )
        })}
      </div>
    </section>
  )
}
