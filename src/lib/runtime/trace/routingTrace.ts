import crypto from 'crypto'

import type { RuntimeEvent } from '../runtimeTypes'

export type RoutingTrace = {
  traceId: string
  invocationId: string
  routingId: string
  sourceEventId: string
  action?: string
  signalSource: string
  routingReason: string
  routingLegality: 'legal' | 'blocked'
  routingTimestamp: string
  topologyLineage: readonly string[]
  replayIds: {
    eventId: string
    lineageId?: string
    traceId?: string
    correlationId?: string
  }
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

export function createDeterministicTraceId(parts: readonly (string | undefined)[]) {
  return crypto.createHash('sha256').update(parts.filter(Boolean).join('|')).digest('hex').slice(0, 24)
}

export function buildRoutingTrace(event: RuntimeEvent): RoutingTrace | null {
  if (event.type !== 'routing.plan.created' && event.type !== 'operator.analysis.completed') return null

  const payload = payloadRecord(event)
  const action = stringValue(payload.action)
  const routingPlanId = stringValue(payload.routingPlanId) ?? event.id
  const explanation = payload.explanation && typeof payload.explanation === 'object' ? payload.explanation as Record<string, unknown> : {}
  const routingReason = stringValue(explanation.summary) ?? stringValue(payload.denialReason) ?? 'Routing explanation unavailable'
  const topologyLineage = stringList(payload.selectedOperators)
  const invocationId = createDeterministicTraceId([
    event.workspaceId,
    action,
    event.lineageId,
    event.traceId,
    event.correlationId,
  ])

  return {
    traceId: createDeterministicTraceId([event.id, routingPlanId, 'routing-trace']),
    invocationId,
    routingId: routingPlanId,
    sourceEventId: event.id,
    action,
    signalSource: stringValue(payload.source) ?? event.source,
    routingReason,
    routingLegality: payload.legal === true ? 'legal' : 'blocked',
    routingTimestamp: event.createdAt,
    topologyLineage,
    replayIds: {
      eventId: event.id,
      lineageId: event.lineageId,
      traceId: event.traceId,
      correlationId: event.correlationId,
    },
  }
}

export function reconstructRoutingTraces(events: RuntimeEvent[]) {
  return events
    .map(buildRoutingTrace)
    .filter((trace): trace is RoutingTrace => Boolean(trace))
    .sort((left, right) => left.routingTimestamp.localeCompare(right.routingTimestamp))
}
