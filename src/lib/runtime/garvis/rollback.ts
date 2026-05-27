import crypto from 'crypto'

import { emitRuntimeEvent } from '../eventBus'
import { propagateEscalation } from './enforcement'

export type RollbackSeverity = 'SAFE' | 'DEGRADED' | 'CRITICAL'

export type RollbackSignal = {
  rollbackId: string
  action: string
  classification: RollbackSeverity
  reason: string
  lineageId?: string
  traceId?: string
  createdAt: string
  escalated: boolean
}

function severityRank(severity: RollbackSeverity) {
  return { SAFE: 1, DEGRADED: 2, CRITICAL: 3 }[severity]
}

export function reconstructRollbackLineage(events: Array<{
  id: string
  type: string
  createdAt: string
  lineageId?: string
  traceId?: string
  payload?: Record<string, unknown>
}>) {
  return events
    .filter((event) => event.type === 'runtime.rollback.signaled')
    .map((event) => {
      const payload = (event.payload ?? {}) as Record<string, unknown>
      return {
        rollbackId: typeof payload.rollbackId === 'string' ? payload.rollbackId : event.id,
        action: typeof payload.action === 'string' ? payload.action : 'unknown',
        classification: typeof payload.classification === 'string' ? payload.classification as RollbackSeverity : 'SAFE',
        reason: typeof payload.reason === 'string' ? payload.reason : 'Rollback signaled',
        lineageId: event.lineageId,
        traceId: event.traceId,
        createdAt: event.createdAt,
        escalated: severityRank(typeof payload.classification === 'string' ? payload.classification as RollbackSeverity : 'SAFE') >= severityRank('CRITICAL'),
      } satisfies RollbackSignal
    })
}

export async function signalRollback(input: {
  workspaceId: string
  showId?: string
  action: string
  classification: RollbackSeverity
  reason: string
  rollbackId?: string
  traceId?: string
  correlationId?: string
  lineageId?: string
  operatorId?: string
}) {
  const { bootstrapRuntimeSpine } = await import('../bootstrap')
  bootstrapRuntimeSpine()
  const rollbackId = input.rollbackId ?? crypto.randomUUID()
  const event = await emitRuntimeEvent({
    workspaceId: input.workspaceId,
    type: 'runtime.rollback.signaled',
    source: 'system',
    governanceState: input.classification === 'CRITICAL' ? 'escalated' : 'pending',
    executionState: 'rolled-back',
    traceId: input.traceId,
    correlationId: input.correlationId,
    lineageId: input.lineageId,
    payloadType: 'runtime.rollback',
    payload: {
      rollbackId,
      action: input.action,
      classification: input.classification,
      reason: input.reason,
      operatorId: input.operatorId,
      showId: input.showId ?? 'showtela',
      createdAt: new Date().toISOString(),
    },
  })

  if (input.classification === 'CRITICAL') {
    await propagateEscalation({
      workspaceId: input.workspaceId,
      showId: input.showId,
      action: input.action,
      operatorId: input.operatorId,
      blockers: [`Critical rollback signaled: ${input.reason}`],
      escalateTo: 'S3',
      traceId: input.traceId,
      correlationId: input.correlationId,
      lineageId: input.lineageId,
      source: 'system',
      payloadType: 'runtime.rollback',
    })
  }

  return event
}
