import type { OperationEntity } from './types'

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

function OperationCard({ item, onTap }: { item: OperationEntity; onTap?: () => void }) {
  const image = resolveImage(item)
  const unresolved = item.unresolvedCount ?? 0
  const dotColor = unresolved >= 2 ? '#F87171' : unresolved === 1 ? '#F59E0B' : '#4ADE80'
  const statusLabel = unresolved > 0 ? `${unresolved} open` : 'clear'
  const displayName = item.label || item.name
  const movement = item.latest ?? ''

  return (
    <button
      onClick={onTap}
      className="w-full overflow-hidden rounded-[20px] bg-[#FDFCFA] text-left shadow-[0_4px_20px_rgba(0,0,0,0.08)]"
    >
      {/* Image */}
      <div className="relative h-[136px] w-full bg-[#D4C9B4]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="" className="h-full w-full object-cover" />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(8,6,4,0.22) 0%, transparent 55%)' }}
        />
      </div>

      {/* Operational panel */}
      <div className="px-5 pb-5 pt-4">
        <h3 className="text-[22px] font-semibold leading-tight tracking-[-0.3px] text-[#141210]">{displayName}</h3>
        {movement && (
          <p className="mt-1.5 line-clamp-2 text-[14px] leading-snug text-[#5E5348]">{movement}</p>
        )}
        <div className="mt-3.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ backgroundColor: dotColor }} />
            <span className="text-[11px] text-[#9B9187]">{statusLabel}</span>
          </span>
          <span className="text-[13px] font-medium text-[#C89B2F]">Review →</span>
        </div>
      </div>
    </button>
  )
}

export function CrusadeOperationsRail({ items, onOperationTap }: { items: OperationEntity[]; onOperationTap?: (name: string) => void }) {
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
        {items.map((item) => (
          <OperationCard
            key={item.id}
            item={item}
            onTap={() => onOperationTap?.(item.label)}
          />
        ))}
      </div>
    </section>
  )
}
