'use client'
import { useEffect, useState } from 'react'
import { BottomSheet } from './BottomSheet'

type UnresolvedItem = { id: string; title: string; severity?: string; blocking?: boolean; operation?: string; aging?: number }
type FeedItem = { id: string; headline: string; body?: string; timestamp?: string }

const SEVERITY_COLOR: Record<string, string> = { high: '#F87171', medium: '#F59E0B', low: '#4ADE80' }

async function fetchPersonData(name: string) {
  const res = await fetch(`/api/showtela-person?name=${encodeURIComponent(name)}`)
  if (!res.ok) return { unresolved: [], feed: [], notes: '' }
  return res.json() as Promise<{ unresolved: UnresolvedItem[]; feed: FeedItem[]; notes: string }>
}

function formatTime(iso?: string) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
  catch { return '' }
}

export function PersonSheet({ name, role, open, onClose }: { name: string; role?: string; open: boolean; onClose: () => void }) {
  const [data, setData] = useState<{ unresolved: UnresolvedItem[]; feed: FeedItem[]; notes: string } | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !name) return
    let cancelled = false
    const timer = window.setTimeout(() => {
      setLoading(true)
      fetchPersonData(name).then((d) => {
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
      {role && <p className="mb-4 text-[12px] text-[#8B847B]">{role}</p>}
      {loading && <p className="py-8 text-center text-[13px] text-[#8B847B]">Loading...</p>}
      {!loading && data && (
        <>
          {data.notes && (
            <div className="mb-4 rounded-[14px] bg-[#F0EBE1] px-4 py-3">
              <p className="text-[12px] leading-relaxed text-[#5E5348]">{data.notes}</p>
            </div>
          )}
          {data.unresolved.length > 0 && (
            <div className="mb-5">
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5E5348]">Unresolved</h3>
              <div className="flex flex-col gap-2">
                {data.unresolved.map((u) => (
                  <div key={u.id} className="flex items-start gap-3 rounded-[14px] bg-white px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
                    <span className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: SEVERITY_COLOR[u.severity ?? 'low'] }} />
                    <div>
                      <p className="text-[13px] font-medium text-[#141210]">{u.title}</p>
                      <p className="text-[11px] text-[#8B847B]">{u.operation}{u.blocking ? ' · Blocking' : ''}{u.aging ? ` · ${u.aging}d` : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {data.feed.length > 0 && (
            <div>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5E5348]">Recent Activity</h3>
              <div className="flex flex-col gap-2">
                {data.feed.map((f) => (
                  <div key={f.id} className="rounded-[14px] bg-white px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
                    <div className="flex items-center justify-between">
                      <p className="text-[13px] font-semibold text-[#141210]">{f.headline}</p>
                      <p className="text-[10px] text-[#C89B2F]">{formatTime(f.timestamp)}</p>
                    </div>
                    {f.body && <p className="mt-0.5 text-[11px] leading-relaxed text-[#5E5348]">{f.body}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {data.unresolved.length === 0 && data.feed.length === 0 && (
            <p className="py-8 text-center text-[13px] text-[#8B847B]">No active items.</p>
          )}
        </>
      )}
    </BottomSheet>
  )
}
