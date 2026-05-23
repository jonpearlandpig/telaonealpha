'use client'
import { useEffect, useState } from 'react'
import { BottomSheet } from './BottomSheet'

type UnresolvedItem = { id: string; title: string; severity?: string; blocking?: boolean; aging?: number; owner?: string }

const SEVERITY_COLOR: Record<string, string> = { high: '#F87171', medium: '#F59E0B', low: '#4ADE80' }
const STATUS_COLOR: Record<string, string> = { Active: '#4ADE80', Pending: '#F59E0B', Blocked: '#F87171', 'All Clear': '#4ADE80' }

async function fetchOperationData(name: string) {
  const res = await fetch(`/api/showtela-operation?name=${encodeURIComponent(name)}`)
  if (!res.ok) return { unresolved: [], movement: '', status: '', pressure: '' }
  return res.json() as Promise<{ unresolved: UnresolvedItem[]; movement: string; status: string; pressure: string }>
}

export function OperationSheet({
  name,
  open,
  onClose,
  onResolve,
}: {
  name: string
  open: boolean
  onClose: () => void
  onResolve?: (name: string, detail?: { movement: string; unresolvedTitles: string[] }) => void
}) {
  const [data, setData] = useState<{ unresolved: UnresolvedItem[]; movement: string; status: string; pressure: string } | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !name) return
    let cancelled = false
    const timer = window.setTimeout(() => {
      setLoading(true)
      fetchOperationData(name).then((d) => {
        if (cancelled) return
        setData(d)
        setLoading(false)
      })
    }, 0)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [open, name])

  return (
    <BottomSheet open={open} onClose={onClose} title={name}>
      {loading && <p className="py-8 text-center text-[13px] text-[#8B847B]">Surfacing operation…</p>}
      {!loading && data && (
        <>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
            {data.status && (
              <span className="rounded-full px-3 py-1 text-[11px] font-semibold" style={{ backgroundColor: `${STATUS_COLOR[data.status] ?? '#4ADE80'}22`, color: STATUS_COLOR[data.status] ?? '#4ADE80' }}>
                {data.status}
              </span>
            )}
            {data.movement && <p className="text-[12px] text-[#8B847B]">{data.movement}</p>}
            </div>
            {onResolve && data.unresolved.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  onResolve(name, {
                    movement: data.movement,
                    unresolvedTitles: data.unresolved.map((item) => item.title),
                  })
                  onClose()
                }}
                className="rounded-full border border-[#D9CEBD] bg-[#F4EFE6] px-3 py-1.5 text-[11px] font-medium text-[#6B5D4B]"
              >
                Mark stabilized
              </button>
            )}
          </div>
          {data.unresolved.length > 0 ? (
            <div>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5E5348]">Unresolved</h3>
              <div className="flex flex-col gap-2">
                {data.unresolved.map((u) => (
                  <div key={u.id} className="flex items-start gap-3 rounded-[14px] bg-white px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
                    <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: SEVERITY_COLOR[u.severity ?? 'low'] }} />
                    <div>
                      <p className="text-[13px] font-medium text-[#141210]">{u.title}</p>
                      <p className="text-[11px] text-[#8B847B]">
                        {u.owner ? `${u.owner} · ` : ''}{u.blocking ? 'Blocking · ' : ''}{u.aging ? `${u.aging}d ago` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-[14px] bg-[#F0FFF4] px-4 py-3">
              <span className="h-2 w-2 flex-shrink-0 rounded-full bg-[#4ADE80]" />
              <p className="text-[13px] font-medium text-[#166534]">All clear — operation is resolved</p>
            </div>
          )}
        </>
      )}
    </BottomSheet>
  )
}
