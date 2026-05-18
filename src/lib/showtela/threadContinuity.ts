import type { ContinuityFeedEvent } from './types'

function threadKey(event: ContinuityFeedEvent) {
  const fromTag = event.tags?.[0]
  const fromOwner = event.owner?.id
  return event.threadId || fromTag || fromOwner || event.id
}

export function threadContinuity(events: ContinuityFeedEvent[]): ContinuityFeedEvent[] {
  const grouped = new Map<string, ContinuityFeedEvent[]>()
  for (const event of events) {
    const key = threadKey(event)
    grouped.set(key, [...(grouped.get(key) ?? []), event])
  }

  const merged: ContinuityFeedEvent[] = []
  for (const [key, cluster] of grouped) {
    const sorted = [...cluster].sort((a, b) => new Date(b.timestamp ?? 0).getTime() - new Date(a.timestamp ?? 0).getTime())
    const top = sorted[0]
    merged.push({ ...top, id: key, body: sorted.map((e) => e.body).filter(Boolean).join(' • '), tags: Array.from(new Set(sorted.flatMap((e) => e.tags ?? []))) })
  }

  return merged.sort((a, b) => new Date(b.timestamp ?? 0).getTime() - new Date(a.timestamp ?? 0).getTime())
}
