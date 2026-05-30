import { emitRuntimeEvent } from '@/lib/runtime/eventBus'
import type { RuntimeEvent } from '@/lib/runtime/runtimeTypes'
import type { ConstitutionalInput, ConstitutionalInvocationResult } from './constitutionalTypes'
import { executeConstitutionalMiddleware } from './constitutionalMiddleware'
import { buildConstitutionalLifecycle } from './constitutionalLifecycle'

export async function invokeConstitutionalMiddleware(
  input: ConstitutionalInput,
  emitEvent: typeof emitRuntimeEvent = emitRuntimeEvent,
): Promise<ConstitutionalInvocationResult> {
  const result = executeConstitutionalMiddleware(input)
  const lineageId = result.lineageRef.lineageId
  const lifecycle = buildConstitutionalLifecycle(result)
  const emittedEventIds: string[] = []

  for (const descriptor of lifecycle) {
    const event = await emitEvent({
      workspaceId: input.workspaceId,
      type: descriptor.type,
      source: input.source ?? 'system',
      governanceState: descriptor.governanceState,
      executionState: descriptor.executionState,
      traceId: input.traceId,
      correlationId: input.correlationId,
      lineageId,
      payloadType: descriptor.payloadType,
      createdAt: input.timestamp,
      payload: {
        ...input.payload,
        action: input.action,
        constitutionalPath: result.constitutionalPath,
        constitutionalSystems: result.constitutionalSystems,
        legitimacy: result.legitimacy,
        rightsValidation: result.rightsValidation,
        governanceState: result.governanceState,
        auditTrace: result.auditTrace,
        escalationRequired: result.escalationRequired,
        blockingReason: result.blockingReason,
        legalityConfirmed: result.legalityConfirmed,
        authorshipTrace: result.authorshipTrace,
        lineageRef: result.lineageRef,
      },
    })
    emittedEventIds.push((event as RuntimeEvent).id)
  }

  return {
    ...result,
    emittedEventIds,
  }
}
