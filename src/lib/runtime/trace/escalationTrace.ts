import type { RuntimeEvent } from '../runtimeTypes'
import { createDeterministicTraceId } from './routingTrace'

export type EscalationTrace = {
  traceId: string
  escalationId: string
  sourceEventId: string
  escalationReason: string
  escalationSource: string
  escalationDestination: readonly string[]
  escalationLegality: 'legal' | 'blocked'
  escalationState: 'escalated' | 'resolved'
  escalationResolution?: string
  createdAt: string
}

function payloadRecord(event: RuntimeEvent) {
  return event.payload && typeof event.payload === 'object' && !Array.isArray(event.payload)
    ? event.payload as Record<string, unknown>
    : {}
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

export function buildEscalationTrace(event: RuntimeEvent): EscalationTrace | null {
  if (event.type !== 'operator.escalated' && event.type !== 'constitutional.escalated' && event.type !== 'escalation.triggered') return null
  const payload = payloadRecord(event)
  const destinations = stringList(payload.escalationPath).length > 0
    ? stringList(payload.escalationPath)
    : stringList(payload.constitutionalPath)

  return {
    traceId: createDeterministicTraceId([event.id, event.type, 'escalation-trace']),
    escalationId: createDeterministicTraceId([event.workspaceId, event.lineageId, event.type, 'escalation']),
    sourceEventId: event.id,
    escalationReason: stringValue(payload.reason) ?? stringValue(payload.blockingReason) ?? 'escalation-required',
    escalationSource: event.type.startsWith('constitutional.') ? 'constitutional' : 'operator',
    escalationDestination: destinations,
    escalationLegality: event.governanceState === 'blocked' ? 'blocked' : 'legal',
    escalationState: 'escalated',
    escalationResolution: stringValue(payload.resolution),
    createdAt: event.createdAt,
  }
}

export function reconstructEscalationTraces(events: RuntimeEvent[]) {
  return events
    .map(buildEscalationTrace)
    .filter((trace): trace is EscalationTrace => Boolean(trace))
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
}
