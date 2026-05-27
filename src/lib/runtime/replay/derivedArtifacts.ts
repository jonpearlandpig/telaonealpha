import { ACTIONS } from '../actions'
import type { OperationalObject } from '../operationalState'
import type { RuntimeEvent } from '../runtimeTypes'

export function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

export function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

export function stringRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

export function projectRefs(event: RuntimeEvent): string[] {
  const payload = event.payload ?? {}
  const directProject = stringValue(payload.projectId)
  const projectIds = stringList(payload.projectIds)
  const linkedProjects = stringList(payload.linkedEntities).filter((value) => /project|show|tour|crusade|venue/i.test(value))
  return Array.from(new Set([directProject, ...projectIds, ...linkedProjects].filter(Boolean) as string[]))
}

export function decisionLabel(event: RuntimeEvent): string | undefined {
  const payload = event.payload ?? {}
  const headline = stringValue(payload.normalizedHeadline) ?? stringValue(payload.headline) ?? stringValue(payload.title)
  if (headline) return headline
  if (event.governanceState === 'approved' && event.executionState === 'completed') return event.type
  return undefined
}

export function deriveOperationalObjects(event: RuntimeEvent): OperationalObject[] {
  const payload = stringRecord(event.payload)
  const createdAt = event.createdAt
  const objects: OperationalObject[] = []
  const threadId = stringValue(payload.threadId)

  if (threadId) {
    objects.push({
      id: `thread:${threadId}`,
      objectType: 'continuity-thread',
      lineageId: event.lineageId,
      status: event.type === ACTIONS.ARCHIVE_CONTINUITY ? 'archived' : 'active',
      createdAt,
      updatedAt: createdAt,
      payload: {
        threadId,
        eventType: event.type,
        payloadType: event.payloadType,
      },
    })
  }

  if (
    event.type === 'governance.blocked' ||
    event.type === 'execution.denied' ||
    event.type === 'escalation.triggered' ||
    event.type === 'operator.blocked' ||
    event.type === 'operator.escalated' ||
    event.type === 'governance.escalation.propagated' ||
    event.type === 'governance.nil.blocked' ||
    event.type === 'governance.two-key.blocked' ||
    event.type === 'runtime.rollback.signaled'
  ) {
    objects.push({
      id: `governance:${event.lineageId ?? event.id}`,
      objectType: 'governance',
      lineageId: event.lineageId,
      status: event.type.replace('.', '-'),
      createdAt,
      updatedAt: createdAt,
      payload: {
        type: event.type,
        traceId: event.traceId,
        correlationId: event.correlationId,
      },
    })
  }

  if (event.type === 'routing.plan.created' || event.type === 'operator.analysis.completed') {
    objects.push({
      id: `routing:${event.payload?.routingPlanId ?? event.id}`,
      objectType: 'routing-plan',
      lineageId: event.lineageId,
      status: event.governanceState,
      createdAt,
      updatedAt: createdAt,
      payload: payload,
    })
  }

  if (event.type === 'governance.validated' || event.type === 'operator.analysis.completed') {
    objects.push({
      id: `legality:${event.payload?.action ?? event.id}`,
      objectType: 'legality-check',
      lineageId: event.lineageId,
      status: payload.allowed === true ? 'allowed' : 'denied',
      createdAt,
      updatedAt: createdAt,
      payload,
    })
  }

  if (event.type === 'execution.authorized' || event.type === 'operator.execution.approved' || event.type === 'operator.execution.completed') {
    objects.push({
      id: `execution:${event.payload?.action ?? event.id}`,
      objectType: 'execution',
      lineageId: event.lineageId,
      status: event.type === 'operator.execution.completed' ? 'completed' : 'authorized',
      createdAt,
      updatedAt: createdAt,
      payload,
    })
  }

  if (payload.authorshipTrace || payload.lineageRef || payload.rightsValidation) {
    objects.push({
      id: `authorship:${event.lineageId ?? event.id}`,
      objectType: 'authorship-guard',
      lineageId: event.lineageId,
      status: payload.rightsValidation && stringRecord(payload.rightsValidation).allowed === false ? 'blocked' : 'verified',
      createdAt,
      updatedAt: createdAt,
      payload: {
        authorshipTrace: payload.authorshipTrace,
        lineageRef: payload.lineageRef,
        rightsValidation: payload.rightsValidation,
      },
    })
  }

  for (const entityId of [stringValue(payload.entityId), ...stringList(payload.linkedEntities)].filter(Boolean) as string[]) {
    objects.push({
      id: `entity:${entityId}`,
      objectType: 'entity',
      lineageId: event.lineageId,
      status: 'active',
      createdAt,
      updatedAt: createdAt,
      payload: {
        entityId,
        threadId,
      },
    })
  }

  const decision = decisionLabel(event)
  if (decision) {
    objects.push({
      id: `decision:${event.id}`,
      objectType: 'decision',
      lineageId: event.lineageId,
      status: `${event.governanceState}:${event.executionState}`,
      createdAt,
      updatedAt: createdAt,
      payload: {
        decision,
        payloadType: event.payloadType,
      },
    })
  }

  return objects
}
