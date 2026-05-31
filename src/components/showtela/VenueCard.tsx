'use client'
import type { VenueItem } from './types'

export function VenueCard({
  venue,
  onTap,
}: {
  venue: VenueItem
  onTap: (venueId: string) => void
}) {
  const location = [venue.city, venue.state].filter(Boolean).join(', ')
  const hasActiveRider = Boolean(venue.activeRiderId)

  return (
    <button
      type="button"
      onClick={() => onTap(venue.id)}
      className="w-full text-left rounded-[18px] bg-white px-4 py-4 shadow-[0_2px_12px_rgba(0,0,0,0.07)] active:scale-[0.98] transition-transform"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="truncate text-[14px] font-semibold text-[#141210]">{venue.name}</p>
          {location && <p className="mt-0.5 text-[11px] text-[#8B847B]">{location}</p>}
        </div>
        <span
          className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full"
          style={{ backgroundColor: hasActiveRider ? '#4ADE80' : '#D4C9B4' }}
        />
      </div>

      <div className="mt-3 flex items-center gap-4">
        {venue.riderCount > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-medium text-[#5E5348]">{venue.riderCount}</span>
            <span className="text-[11px] text-[#8B847B]">{venue.riderCount === 1 ? 'rider' : 'riders'}</span>
          </div>
        )}
        {venue.departments.length > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-medium text-[#5E5348]">{venue.departments.length}</span>
            <span className="text-[11px] text-[#8B847B]">depts</span>
          </div>
        )}
        {venue.loadIn && (
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-[#8B847B]">In</span>
            <span className="text-[11px] font-medium text-[#5E5348]">{venue.loadIn}</span>
          </div>
        )}
      </div>

      {!hasActiveRider && venue.riderCount === 0 && (
        <p className="mt-2 text-[11px] text-[#C89B2F]">No rider uploaded</p>
      )}
      {!hasActiveRider && venue.riderCount > 0 && (
        <p className="mt-2 text-[11px] text-[#C89B2F]">Rider not activated</p>
      )}
    </button>
  )
}
