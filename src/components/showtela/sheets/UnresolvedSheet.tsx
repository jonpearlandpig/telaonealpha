'use client'
import { BottomSheet } from './BottomSheet'

type UnresolvedItem = { id: string; title: string; severity?: string; blocking?: boolean; operation?: string; aging?: number; owner?: string }

const SEVERITY_COLOR: Record<string, string> = { high: '#F87171', medium: '#F59E0B', low: '#4ADE80' }
const SEVERITY_BG: Record<string, string> = { high: '#FEE2E2', medium: '#FEF3C7', low: '#F0FFF4' }

export function UnresolvedSheet({ items, open, onClose }: { items: UnresolvedItem[]; open: boolean; onClose: () => void }) {
  const sorted = [...items].sort((a, b) => {
    const order: Record<string, number> = { high: 0, medium: 1, low: 2 }
    return (order[a.severity ?? 'low'] ?? 2) - (order[b.severity ?? 'low'] ?? 2)
  })

  return (
    <BottomSheet open={open} onClose={onClose} title="Open Pressure">
      {sorted.length === 0 ? (
        <div className="flex items-center gap-3 rounded-[14px] bg-[#F0FFF4] px-4 py-3">
          <span className="h-2 w-2 flex-shrink-0 rounded-full bg-[#4ADE80]" />
          <p className="text-[13px] font-medium text-[#166534]">All clear — nothing unresolved.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((u) => (
            <div key={u.id} className="rounded-[16px] px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.06)]" style={{ backgroundColor: SEVERITY_BG[u.severity ?? 'low'] }}>
              <div className="flex items-start gap-3">
                <span className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: SEVERITY_COLOR[u.severity ?? 'low'] }} />
                <div className="flex-1">
                  <p className="text-[14px] font-semibold text-[#141210]">{u.title}</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {u.operation && <span className="rounded-full bg-[#EAE4DA] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#5E5348]">{u.operation}</span>}
                    {u.blocking && <span className="rounded-full bg-[#FEE2E2] px-2 py-0.5 text-[10px] font-semibold text-[#991B1B]">Blocking</span>}
                    {u.aging ? <span className="text-[10px] text-[#8B847B]">{u.aging}d</span> : null}
                  </div>
                  {u.owner && <p className="mt-1 text-[11px] text-[#8B847B]">{u.owner}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </BottomSheet>
  )
}
