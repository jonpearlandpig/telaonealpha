import type { RuntimeEvent } from '../runtimeTypes'
import { reconstructConstitutionalTraces, type ConstitutionalTrace } from './constitutionalTrace'
import { reconstructEscalationTraces, type EscalationTrace } from './escalationTrace'
import { reconstructGovernanceTraces, type GovernanceTrace } from './governanceTrace'
import { createDeterministicTraceId, reconstructRoutingTraces, type RoutingTrace } from './routingTrace'

export type InvocationTrace = {
  traceId: string
  invocationId: string
  action?: string
  moduleSelected?: string
  governanceApproval: 'approved' | 'blocked'
  constitutionalValidation: 'confirmed' | 'blocked'
  escalationPath: readonly string[]
  recommendationLineage: readonly string[]
  routingTrace?: RoutingTrace
  governanceTrace?: GovernanceTrace
  constitutionalTrace?: ConstitutionalTrace
  escalationTrace?: EscalationTrace
  createdAt: string
}

export function reconstructInvocationTraces(events: RuntimeEvent[]) {
  const routingByInvocation = new Map<string, RoutingTrace>()
  for (const trace of reconstructRoutingTraces(events)) routingByInvocation.set(trace.invocationId, trace)

  const governanceById = new Map<string, GovernanceTrace>()
  for (const trace of reconstructGovernanceTraces(events)) governanceById.set(trace.governanceId, trace)

  const constitutionalByLineage = new Map<string, ConstitutionalTrace>()
  for (const trace of reconstructConstitutionalTraces(events)) constitutionalByLineage.set(trace.constitutionalId, trace)

  const escalationById = new Map<string, EscalationTrace>()
  for (const trace of reconstructEscalationTraces(events)) escalationById.set(trace.escalationId, trace)

  const operatorEvents = events
    .filter((event) => event.type === 'operator.invoked' || event.type === 'operator.execution.completed' || event.type === 'operator.execution.approved')
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))

  return operatorEvents.map((event) => {
    const payload = event.payload && typeof event.payload === 'object' && !Array.isArray(event.payload)
      ? event.payload as Record<string, unknown>
      : {}
    const action = typeof payload.action === 'string' ? payload.action : undefined
    const invocationId = createDeterministicTraceId([
      event.workspaceId,
      action,
      event.lineageId,
      event.traceId,
      event.correlationId,
    ])
    const governanceId = createDeterministicTraceId([event.workspaceId, action, event.lineageId, 'governance'])
    const constitutionalId = createDeterministicTraceId([event.workspaceId, event.lineageId, 'constitutional'])
    const escalationId = createDeterministicTraceId([event.workspaceId, event.lineageId, 'operator.escalated', 'escalation'])
    const routingTrace = routingByInvocation.get(invocationId)
    const governanceTrace = governanceById.get(governanceId)
    const constitutionalTrace = constitutionalByLineage.get(constitutionalId)
    const escalationTrace = escalationById.get(escalationId)

    return {
      traceId: createDeterministicTraceId([event.id, invocationId, 'invocation-trace']),
      invocationId,
      action,
      moduleSelected: typeof payload.operatorId === 'string' ? payload.operatorId : routingTrace?.topologyLineage[0],
      governanceApproval: governanceTrace?.legalityDecision ?? 'blocked',
      constitutionalValidation: constitutionalTrace?.legitimacyState ?? 'blocked',
      escalationPath: escalationTrace?.escalationDestination ?? [],
      recommendationLineage: routingTrace?.topologyLineage ?? [],
      routingTrace,
      governanceTrace,
      constitutionalTrace,
      escalationTrace,
      createdAt: event.createdAt,
    }
  })
}
