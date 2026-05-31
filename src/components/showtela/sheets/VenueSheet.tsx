'use client'
import { useEffect, useState } from 'react'
import { BottomSheet } from './BottomSheet'

type VenueRiderEntry = { id: string; fileName?: string; createdAt: string; isActive: boolean }

type VenueData = {
  id: string
  name: string
  city?: string
  state?: string
  contact?: string
  loadIn?: string
  loadOut?: string
  departments: string[]
  activeRider: VenueRiderEntry | null
  riderHistory: VenueRiderEntry[]
}

async function fetchVenueData(venueId: string): Promise<VenueData | null> {
  const res = await fetch(`/api/venue/${encodeURIComponent(venueId)}`)
  if (!res.ok) return null
  return res.json() as Promise<VenueData>
}

async function promoteRider(venueId: string, artifactId: string): Promise<boolean> {
  const res = await fetch('/api/venue/set-active-rider', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ venueId, artifactId }),
  })
  return res.ok
}

function formatDate(iso: string) {
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
  catch { return iso.slice(0, 10) }
}

function FactRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-[#EAE4DA] py-2.5 last:border-0">
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8B847B]">{label}</span>
      <span className="text-right text-[13px] font-medium text-[#141210]">{value}</span>
    </div>
  )
}

export function VenueSheet({
  venueId,
  venueName,
  open,
  onClose,
}: {
  venueId: string
  venueName: string
  open: boolean
  onClose: () => void
}) {
  const [data, setData] = useState<VenueData | null>(null)
  const [loading, setLoading] = useState(false)
  const [promoting, setPromoting] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !venueId) return
    let cancelled = false
    const timer = window.setTimeout(() => {
      setLoading(true)
      fetchVenueData(venueId).then((d) => {
        if (cancelled) return
        setData(d)
        setLoading(false)
      })
    }, 0)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [open, venueId])

  async function handlePromote(artifactId: string) {
    if (!data) return
    setPromoting(artifactId)
    const ok = await promoteRider(venueId, artifactId)
    if (ok) {
      setData({
        ...data,
        activeRider: data.riderHistory.find(r => r.id === artifactId) ?? data.activeRider,
        riderHistory: data.riderHistory.map(r => ({ ...r, isActive: r.id === artifactId })),
      })
    }
    setPromoting(null)
  }

  const location = [data?.city, data?.state].filter(Boolean).join(', ')

  return (
    <BottomSheet open={open} onClose={onClose} title={venueName}>
      {location && <p className="mb-4 text-[12px] text-[#8B847B]">{location}</p>}

      {loading && <p className="py-8 text-center text-[13px] text-[#8B847B]">Loading venue…</p>}

      {!loading && data && (
        <>
          {/* Operational Facts */}
          <div className="mb-5 rounded-[14px] bg-white px-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <FactRow label="Load In" value={data.loadIn} />
            <FactRow label="Load Out" value={data.loadOut} />
            <FactRow label="Contact" value={data.contact} />
          </div>

          {/* Active Rider */}
          <div className="mb-5">
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5E5348]">Active Rider</h3>
            {data.activeRider ? (
              <div className="flex items-center gap-3 rounded-[14px] bg-[#F0FFF4] px-4 py-3">
                <span className="h-2 w-2 flex-shrink-0 rounded-full bg-[#4ADE80]" />
                <div>
                  <p className="text-[13px] font-medium text-[#166534]">
                    {data.activeRider.fileName ?? 'Production Rider'}
                  </p>
                  <p className="text-[11px] text-[#4ADE80]">{formatDate(data.activeRider.createdAt)}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-[14px] bg-[#FFF9F0] px-4 py-3">
                <span className="h-2 w-2 flex-shrink-0 rounded-full bg-[#F59E0B]" />
                <p className="text-[13px] font-medium text-[#92400E]">No active rider — promote one below</p>
              </div>
            )}
          </div>

          {/* Departments */}
          {data.departments.length > 0 && (
            <div className="mb-5">
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5E5348]">
                Departments · {data.departments.length}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {data.departments.map((dept) => (
                  <span
                    key={dept}
                    className="rounded-full bg-[#F0EBE1] px-3 py-1 text-[11px] font-medium text-[#5E5348]"
                  >
                    {dept}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Rider History */}
          {data.riderHistory.length > 0 && (
            <div>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5E5348]">
                Rider History · {data.riderHistory.length}
              </h3>
              <div className="flex flex-col gap-2">
                {data.riderHistory.map((rider) => (
                  <div
                    key={rider.id}
                    className="flex items-center justify-between gap-3 rounded-[14px] bg-white px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="h-2 w-2 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: rider.isActive ? '#4ADE80' : '#D4C9B4' }}
                      />
                      <div>
                        <p className="text-[13px] font-medium text-[#141210]">
                          {rider.fileName ?? 'Production Rider'}
                        </p>
                        <p className="text-[11px] text-[#8B847B]">{formatDate(rider.createdAt)}</p>
                      </div>
                    </div>
                    {!rider.isActive && (
                      <button
                        type="button"
                        disabled={promoting === rider.id}
                        onClick={() => handlePromote(rider.id)}
                        className="rounded-full border border-[#D9CEBD] bg-[#F4EFE6] px-3 py-1 text-[11px] font-medium text-[#6B5D4B] disabled:opacity-50"
                      >
                        {promoting === rider.id ? '…' : 'Set active'}
                      </button>
                    )}
                    {rider.isActive && (
                      <span className="text-[11px] font-semibold text-[#4ADE80]">Active</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.departments.length === 0 && data.riderHistory.length === 0 && (
            <p className="py-8 text-center text-[13px] text-[#8B847B]">No rider data available.</p>
          )}
        </>
      )}
    </BottomSheet>
  )
}
