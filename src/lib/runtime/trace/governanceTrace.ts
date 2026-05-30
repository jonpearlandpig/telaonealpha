import type { RuntimeEvent } from '../runtimeTypes'
import { createDeterministicTraceId } from './routingTrace'

export type GovernanceTrace = {
  traceId: string
  governanceId: string
  sourceEventId: string
  action?: string
  governancePath: readonly string[]
  legalityDecision: 'approved' | 'blocked'
  approvals: readonly string[]
  rejections: readonly string[]
  escalationReasons: readonly string[]
  legitimacyState: 'confirmed' | 'blocked'
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

export function buildGovernanceTrace(event: RuntimeEvent): GovernanceTrace | null {
  const supported = new Set([
    'governance.validated',
    'governance.blocked',
    'operator.analysis.completed',
    'operator.blocked',
    'operator.escalated',
  ])
  if (!supported.has(event.type)) return null

  const payload = payloadRecord(event)
  const action = stringValue(payload.action)
  const governancePath = stringList(payload.governancePath).length > 0
    ? stringList(payload.governancePath)
    : stringList(payload.escalationPath)
  const denialReason = stringValue(payload.denialReason) ?? stringValue(payload.reason)
  const approved = event.type === 'governance.validated' || (event.type === 'operator.analysis.completed' && payload.legal === true)

  return {
    traceId: createDeterministicTraceId([event.id, event.type, 'governance-trace']),
    governanceId: createDeterministicTraceId([event.workspaceId, action, event.lineageId, 'governance']),
    sourceEventId: event.id,
    action,
    governancePath,
    legalityDecision: approved ? 'approved' : 'blocked',
    approvals: approved ? [event.type] : [],
    rejections: approved ? [] : [denialReason ?? event.type],
    escalationReasons: event.type === 'operator.escalated' ? [denialReason ?? 'escalation-required'] : [],
    legitimacyState: approved ? 'confirmed' : 'blocked',
    createdAt: event.createdAt,
  }
}

export function reconstructGovernanceTraces(events: RuntimeEvent[]) {
  return events
    .map(buildGovernanceTrace)
    .filter((trace): trace is GovernanceTrace => Boolean(trace))
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
}
