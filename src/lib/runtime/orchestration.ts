import { createAuthorshipTrace, type AuthorshipSurface } from '@/lib/showtela/telauthorium'
import { createLineageRef, validateExecutionIntegrity } from '@/lib/showtela/penAndSword'
import { evaluateActionLegality } from './flightpath/legalityEngine'
import { createRoutingPlan } from './mose/routing'
import type { AuthorityLevel, RuntimeAction } from './actions'
import type {
  EnforcementResult,
  ExecutionState,
  GovernanceState,
  LegalityCheckResult,
  RoutingPlan,
  RuntimeEventSource,
} from './runtimeTypes'

type ProtectedClassification = {
  creativeOutput?: boolean
  sacredIp?: boolean
  authorshipSensitive?: boolean
}

type OrchestrationInput = {
  workspaceId: string
  action: RuntimeAction
  authority: AuthorityLevel
  governanceState: GovernanceState
  executionState: ExecutionState
  source?: RuntimeEventSource
  operatorId?: string
  traceId?: string
  correlationId?: string
  previousAction?: RuntimeAction
  threadId?: string
  entityId?: string
  projectId?: string
  linkedEntities?: string[]
  payload?: Record<string, unknown>
  authorship?: {
    required?: boolean
    author?: string
    surface?: AuthorshipSurface
    parentLineageId?: string
    existingLineageChain?: readonly string[]
    rightsInheritance?: readonly string[]
    nilRestricted?: boolean
    nilReason?: string
  }
  classification?: ProtectedClassification
  twoKey?: {
    required: boolean
    approvedBy?: string[]
    minimumApprovers?: number
  }
}

export type OrchestrationEnvelope = {
  protectedAction: boolean
  authorshipTrace?: ReturnType<typeof createAuthorshipTrace>
  lineageRef?: ReturnType<typeof createLineageRef>
  rightsValidation?: ReturnType<typeof validateExecutionIntegrity>
  legality: LegalityCheckResult
  routingPlan: RoutingPlan
}

export type OrchestrationResult = {
  routingPlan: RoutingPlan
  legality: LegalityCheckResult
  enforcement: EnforcementResult
  protectedAction: boolean
  authorshipTrace?: ReturnType<typeof createAuthorshipTrace>
  lineageRef?: ReturnType<typeof createLineageRef>
  rightsValidation?: ReturnType<typeof validateExecutionIntegrity>
}

function isProtectedAction(input: OrchestrationInput) {
  return input.authorship?.required === true ||
    input.classification?.creativeOutput === true ||
    input.classification?.sacredIp === true ||
    input.classification?.authorshipSensitive === true
}

export function buildOrchestrationEnvelope(input: OrchestrationInput): OrchestrationEnvelope {
  const protectedAction = isProtectedAction(input)
  const authorshipTrace = protectedAction
    ? createAuthorshipTrace({
        author: input.authorship?.author,
        surface: input.authorship?.surface ?? 'runtime',
      })
    : undefined
  const lineageRef = protectedAction
    ? createLineageRef({
        parentId: input.authorship?.parentLineageId,
        existingChain: input.authorship?.existingLineageChain,
      })
    : undefined
  const rightsValidation = protectedAction
    ? validateExecutionIntegrity({
        rightsInheritance: input.authorship?.rightsInheritance,
        nilRestricted: input.authorship?.nilRestricted,
        nilReason: input.authorship?.nilReason,
        authority: input.authority,
        governanceState: input.governanceState,
      })
    : undefined

  const legality = evaluateActionLegality({
    action: input.action,
    governanceState: input.governanceState,
    executionState: input.executionState,
    authority: input.authority,
    previousAction: input.previousAction,
  })

  const routingPlan = createRoutingPlan({
    action: input.action,
    governanceState: input.governanceState,
    executionState: input.executionState,
    authority: input.authority,
    previousAction: input.previousAction,
  })

  return {
    protectedAction,
    authorshipTrace,
    lineageRef,
    rightsValidation,
    legality,
    routingPlan,
  }
}

export async function orchestrateRuntimeAction(input: OrchestrationInput): Promise<OrchestrationResult> {
  const [{ bootstrapRuntimeSpine }, { enforceRuntimeAction }, { emitRuntimeEvent }] = await Promise.all([
    import('./bootstrap'),
    import('./garvis/enforcement'),
    import('./eventBus'),
  ])

  bootstrapRuntimeSpine()
  const envelope = buildOrchestrationEnvelope(input)
  const lineageId = envelope.lineageRef?.lineageId ?? input.authorship?.parentLineageId
  const eventPayload = {
    ...input.payload,
    action: input.action,
    threadId: input.threadId,
    entityId: input.entityId,
    projectId: input.projectId,
    linkedEntities: input.linkedEntities,
    parentLineageId: input.authorship?.parentLineageId,
    authorshipTrace: envelope.authorshipTrace,
    lineageRef: envelope.lineageRef,
    rightsValidation: envelope.rightsValidation,
  }

  await emitRuntimeEvent({
    workspaceId: input.workspaceId,
    type: 'governance.validated',
    source: input.source ?? 'operator',
    governanceState: envelope.legality.allowed ? input.governanceState : 'blocked',
    executionState: envelope.legality.allowed ? 'completed' : 'failed',
    traceId: input.traceId,
    correlationId: input.correlationId,
    lineageId,
    payloadType: 'governance.validation',
    payload: {
      ...eventPayload,
      action: input.action,
      allowed: envelope.legality.allowed && (envelope.rightsValidation?.allowed ?? true),
      requiredAuthority: envelope.legality.requiredAuthority,
      denialReason: envelope.rightsValidation?.denialReason ?? envelope.legality.denialReason,
      source: envelope.rightsValidation ? 'pen-and-sword' : 'flightpath',
    },
  })

  await emitRuntimeEvent({
    workspaceId: input.workspaceId,
    type: 'routing.plan.created',
    source: input.source ?? 'operator',
    governanceState: input.governanceState,
    executionState: input.executionState,
    traceId: input.traceId,
    correlationId: input.correlationId,
    lineageId,
    payloadType: 'routing.plan',
    payload: {
      ...eventPayload,
      routingPlanId: envelope.routingPlan.id,
      action: input.action,
      selectedOperators: envelope.routingPlan.selectedOperators,
      sequence: envelope.routingPlan.sequence,
      rollbackClass: envelope.routingPlan.rollbackClass,
      escalationPath: envelope.routingPlan.escalationPath,
      governanceState: envelope.routingPlan.governanceState,
      legal: envelope.legality.allowed && (envelope.rightsValidation?.allowed ?? true),
    },
  })

  const enforcement = await enforceRuntimeAction({
    workspaceId: input.workspaceId,
    action: input.action,
    governanceState: input.governanceState,
    executionState: input.executionState,
    authority: input.authority,
    traceId: input.traceId,
    correlationId: input.correlationId,
    lineageId,
    source: input.source ?? 'operator',
    operatorId: input.operatorId,
    previousAction: input.previousAction,
    twoKey: input.twoKey,
    nilProtection: {
      protected: envelope.rightsValidation?.nilRestricted === true || envelope.rightsValidation?.allowed === false,
      reason: envelope.rightsValidation?.denialReason,
    },
  })

  if (enforcement.allowed) {
    await emitRuntimeEvent({
      workspaceId: input.workspaceId,
      type: 'execution.authorized',
      source: input.source ?? 'operator',
      governanceState: input.governanceState,
      executionState: 'completed',
      traceId: input.traceId,
      correlationId: input.correlationId,
      lineageId,
      payloadType: 'execution.authorization',
      payload: {
        ...eventPayload,
        action: input.action,
        routingPlanId: envelope.routingPlan.id,
        selectedOperators: envelope.routingPlan.selectedOperators,
      },
    })
  }

  return {
    routingPlan: envelope.routingPlan,
    legality: envelope.legality,
    enforcement,
    protectedAction: envelope.protectedAction,
    authorshipTrace: envelope.authorshipTrace,
    lineageRef: envelope.lineageRef,
    rightsValidation: envelope.rightsValidation,
  }
}
