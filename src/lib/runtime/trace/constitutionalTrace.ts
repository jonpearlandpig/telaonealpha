import { buildConstitutionalObservability } from '@/lib/constitutional/runtime/constitutionalObservability'
import type { RuntimeEvent } from '../runtimeTypes'
import { createDeterministicTraceId } from './routingTrace'

export type ConstitutionalTrace = {
  traceId: string
  sourceEventId: string
  constitutionalId: string
  executionOrder: readonly string[]
  legitimacyState: 'confirmed' | 'blocked'
  blockingReason?: string
  auditTrace?: Record<string, unknown>
  escalationPath: readonly string[]
  createdAt: string
}

function payloadRecord(event: RuntimeEvent) {
  return event.payload && typeof event.payload === 'object' && !Array.isArray(event.payload)
    ? event.payload as Record<string, unknown>
    : {}
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

export function buildConstitutionalTrace(event: RuntimeEvent): ConstitutionalTrace | null {
  if (!event.type.startsWith('constitutional.')) return null
  const payload = payloadRecord(event)
  const constitutionalPath = stringList(payload.constitutionalPath)
  const auditTrace = payload.auditTrace && typeof payload.auditTrace === 'object' && !Array.isArray(payload.auditTrace)
    ? payload.auditTrace as Record<string, unknown>
    : undefined

  return {
    traceId: createDeterministicTraceId([event.id, event.type, 'constitutional-trace']),
    sourceEventId: event.id,
    constitutionalId: createDeterministicTraceId([event.workspaceId, event.lineageId, 'constitutional']),
    executionOrder: constitutionalPath,
    legitimacyState: event.type === 'constitutional.blocked' ? 'blocked' : 'confirmed',
    blockingReason: stringValue(payload.blockingReason),
    auditTrace,
    escalationPath: event.type === 'constitutional.escalated' ? constitutionalPath : [],
    createdAt: event.createdAt,
  }
}

export function reconstructConstitutionalTraces(events: RuntimeEvent[]) {
  return events
    .map(buildConstitutionalTrace)
    .filter((trace): trace is ConstitutionalTrace => Boolean(trace))
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
}

export function summarizeConstitutionalReplay(events: RuntimeEvent[]) {
  return buildConstitutionalObservability(events)
}
