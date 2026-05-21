import type { OperationEntity } from './types'

const OP_ICONS: Record<string, string> = {
  travel: '✈', logistics: '🚛', venues: '🏛', hospitality: '🍽', security: '🛡',
  marketing: '📣', finance: '💰', legal: '⚖', production: '🎭', touring: '🗺',
}


export function CrusadeOperationsRail({ items, onOperationTap }: { items: OperationEntity[]; onOperationTap?: (name: string) => void }) {
  const overflow = items.length > 5 ? items.length - 5 : 0
  const visible = items.slice(0, 5)

  return (
    <section className="px-5 pb-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#5E5348]">Crusade Operations</h2>
        <button className="text-[11px] font-medium text-[#C89B2F]">View all</button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {visible.map((item) => {
          const key = (item.label ?? item.name ?? item.id).toLowerCase()
          const icon = Object.entries(OP_ICONS).find(([k]) => key.includes(k))?.[1] ?? '⚙'
          const subtitle = item.latest || ''
          const unresolved = item.unresolvedCount ?? 0
          const dotColor = unresolved >= 2 ? '#F87171' : unresolved === 1 ? '#F59E0B' : '#4ADE80'
          const statusLabel = unresolved > 0 ? `${unresolved} ${unresolved === 1 ? 'pending' : 'unresolved'}` : 'All good'
          const statusColor = unresolved >= 2 ? '#F87171' : unresolved === 1 ? '#F59E0B' : '#4ADE80'
          return (
            <button key={item.id} onClick={() => onOperationTap?.(item.label)} className="relative min-w-[108px] overflow-hidden rounded-[18px] bg-[#141210] px-3 py-3.5 text-left shadow-[0_14px_36px_rgba(0,0,0,0.28)]">
              <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(200,155,47,0.18),transparent_65%)]" />
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full" style={{ backgroundColor: dotColor }} />
              <div className="relative mb-2 text-[22px]">{icon}</div>
              <p className="relative text-[12px] font-semibold text-[#F0E6D0]">{item.label}</p>
              <p className="relative mt-0.5 text-[10px] font-medium" style={{ color: statusColor }}>{statusLabel}</p>
              <p className="relative mt-0.5 text-[10px] text-[#A89880]">{subtitle}</p>
            </button>
          )
        })}
        {overflow > 0 && (
          <button className="flex min-w-[72px] flex-col items-center justify-center rounded-[18px] border border-dashed border-[#3A3226] px-3 py-3.5">
            <span className="text-[13px] font-semibold text-[#8B7B62]">+{overflow}</span>
            <span className="mt-0.5 text-[10px] text-[#5E5348]">More</span>
          </button>
        )}
      </div>
    </section>
  )
}
