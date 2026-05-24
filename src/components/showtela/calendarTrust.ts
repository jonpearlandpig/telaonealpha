import type { OperationalCalendarEvent } from '@/lib/showtela/calendar'

export function formatRelativeTrustTime(value?: string) {
  if (!value) return 'Waiting for first refresh'

  const timestamp = new Date(value).getTime()
  if (Number.isNaN(timestamp)) return 'Waiting for first refresh'

  const diffMs = Date.now() - timestamp
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000))

  if (diffMinutes < 1) return 'Updated just now'
  if (diffMinutes < 60) return `Updated ${diffMinutes}m ago`

  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 12) return `Updated ${diffHours}h ago`

  return `Refreshed at ${new Date(timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
}

function typeLabel(event?: OperationalCalendarEvent) {
  if (!event) return 'calendar'
  if (event.type === 'venue') return 'venue'
  if (event.type === 'travel') return 'travel'
  if (event.type === 'hospitality') return 'hospitality'
  if (event.type === 'production' || event.type === 'show') return 'load-in'
  if (event.type === 'staffing') return 'crew'
  return 'calendar'
}

export function buildTrustStatus({
  diagnosticState,
  event,
  lastHydratedAt,
}: {
  diagnosticState?: string
  event?: OperationalCalendarEvent
  lastHydratedAt?: string
}) {
  if (diagnosticState === 'notion-unavailable') {
    return `Waiting for latest ${typeLabel(event)} sync`
  }
  if (diagnosticState === 'persistence-failed') {
    return 'Automation not connected yet'
  }
  if (diagnosticState === 'persistence-stale') {
    return 'Last update is still catching up'
  }

  return formatRelativeTrustTime(lastHydratedAt ?? event?.timestamp)
}
