import type { ContinuityEvent } from '@/lib/showtela/types'
import type { RuntimeEvent } from './runtimeTypes'

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : []
}

export function buildContinuityFeedFromRuntimeEvents(events: RuntimeEvent[]): ContinuityEvent[] {
  return events
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((event) => {
      const payload = event.payload ?? {}
      const headline =
        stringValue(payload.headline) ??
        stringValue(payload.title) ??
        stringValue(payload.summary) ??
        event.type

      return {
        id: event.id,
        headline,
        body: stringValue(payload.body) ?? stringValue(payload.description),
        summary: stringValue(payload.summary),
        timestamp: event.createdAt,
        tags: [event.type, event.payloadType].filter((item): item is string => Boolean(item)),
        owner: { id: event.source, name: event.source },
        linkedEntities: stringArray(payload.linkedEntities).concat(stringArray(payload.linked_entities)),
        threadId: stringValue(payload.threadId) ?? event.correlationId,
      }
    })
}
