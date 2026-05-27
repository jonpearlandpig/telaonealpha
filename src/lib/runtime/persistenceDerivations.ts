import type {
  EnforcementActionRow,
  LineageGraphRow,
  OperationalObjectRow,
  RoutingPlanRow,
} from '@/lib/supabase/schema'
import type { RuntimeEvent } from './runtimeTypes'
import { deriveOperationalObjects, stringList, stringRecord, stringValue } from './replay/derivedArtifacts'

export type RuntimePersistenceMutations = {
  operationalObjects: OperationalObjectRow[]
  routingPlans: RoutingPlanRow[]
  enforcementActions: EnforcementActionRow[]
  lineageGraph: LineageGraphRow[]
}

function routingPlanRowsForEvent(event: RuntimeEvent): RoutingPlanRow[] {
  if (event.type !== 'routing.plan.created' && event.type !== 'operator.analysis.completed') return []
  const payload = stringRecord(event.payload)
  const action = stringValue(payload.action)
  const governanceState = stringValue(payload.governanceState)
  const rollbackClass = stringValue(payload.rollbackClass)
  if (!action || !governanceState || !rollbackClass) return []

  return [{
    id: stringValue(payload.routingPlanId) ?? event.id,
    action,
    governanceState,
    selectedOperators: stringList(payload.selectedOperators),
    sequence: Array.isArray(payload.sequence)
      ? payload.sequence.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
      : [],
    rollbackClass,
    escalationPath: stringList(payload.escalationPath),
    createdAt: event.createdAt,
  }]
}

function enforcementRowsForEvent(event: RuntimeEvent): EnforcementActionRow[] {
  if (![
    'execution.denied',
    'governance.blocked',
    'escalation.triggered',
    'execution.authorized',
    'governance.validated',
    'operator.blocked',
    'operator.escalated',
    'operator.execution.approved',
    'operator.execution.completed',
    'operator.analysis.completed',
  ].includes(event.type)) {
    return []
  }

  const payload = stringRecord(event.payload)
  const action = stringValue(payload.action) ?? event.type
  const reason = stringValue(payload.denialReason) ?? stringValue(payload.reason)

  return [{
    id: event.id,
    eventId: event.id,
    action,
    decision: event.type,
    reason,
    createdAt: event.createdAt,
  }]
}

function lineageRowsForEvent(event: RuntimeEvent): LineageGraphRow[] {
  const payload = stringRecord(event.payload)
  const parentLineageId = stringValue(payload.parentLineageId)
  const lineageRef = stringRecord(payload.lineageRef)
  const lineageId = event.lineageId ?? stringValue(lineageRef.lineageId)
  if (!lineageId) return []

  return [{
    id: `edge:${event.id}`,
    lineageId,
    parentLineageId: stringValue(lineageRef.parentId) ?? parentLineageId,
    eventId: event.id,
    relationType: stringValue(payload.relationType) ?? (parentLineageId || stringValue(lineageRef.parentId) ? 'lineage-parent' : 'lineage-root'),
    createdAt: event.createdAt,
  }]
}

function operationalObjectRowsForEvent(event: RuntimeEvent): OperationalObjectRow[] {
  return deriveOperationalObjects(event).map((item) => ({
    id: item.id,
    objectType: item.objectType,
    lineageId: item.lineageId,
    status: item.status,
    payload: item.payload,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }))
}

export function buildPersistenceMutationsForEvent(event: RuntimeEvent): RuntimePersistenceMutations {
  return {
    operationalObjects: operationalObjectRowsForEvent(event),
    routingPlans: routingPlanRowsForEvent(event),
    enforcementActions: enforcementRowsForEvent(event),
    lineageGraph: lineageRowsForEvent(event),
  }
}
