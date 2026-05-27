import type { AuthorshipSurface } from '@/lib/showtela/types'
import { executeConstitutionalMiddleware } from '@/lib/constitutional/runtime/constitutionalMiddleware'
import { invokeConstitutionalMiddleware } from '@/lib/constitutional/runtime/constitutionalInvocation'
import type { ConstitutionalInvocationResult, ConstitutionalMiddlewareResult } from '@/lib/constitutional/runtime/constitutionalTypes'
import { evaluateActionLegality } from './flightpath/legalityEngine'
import { createRoutingPlan } from './mose/routing'
import type { AuthorityLevel, RuntimeAction } from './actions'
import type {
  ConstitutionalSystemState,
  EnforcementResult,
  ExecutionState,
  GovernanceState,
  LegalityCheckResult,
  OperatorInvocationOutput,
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
  showId?: string
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
    requiredApprovers?: string[]
    requiredAuthorityAlignment?: AuthorityLevel[]
  }
}

export type OrchestrationEnvelope = {
  protectedAction: boolean
  authorshipTrace: ConstitutionalInvocationResult['authorshipTrace']
  lineageRef: ConstitutionalInvocationResult['lineageRef']
  rightsValidation?: ConstitutionalInvocationResult['rightsValidation']
  legality: LegalityCheckResult
  routingPlan: RoutingPlan
  constitutionalSystems: ConstitutionalSystemState[]
  invocationOutput: OperatorInvocationOutput
}

export type OrchestrationResult = {
  routingPlan: RoutingPlan
  legality: LegalityCheckResult
  enforcement: EnforcementResult
  protectedAction: boolean
  authorshipTrace: ConstitutionalInvocationResult['authorshipTrace']
  lineageRef: ConstitutionalInvocationResult['lineageRef']
  rightsValidation?: ConstitutionalInvocationResult['rightsValidation']
  constitutionalSystems: ConstitutionalSystemState[]
  invocationOutput: OperatorInvocationOutput
}

function isProtectedAction(input: OrchestrationInput) {
  return input.authorship?.required === true ||
    input.classification?.creativeOutput === true ||
    input.classification?.sacredIp === true ||
    input.classification?.authorshipSensitive === true
}

export function buildOrchestrationEnvelope(
  input: OrchestrationInput,
  constitutional = executeConstitutionalMiddleware({
    workspaceId: input.workspaceId,
    action: input.action,
    authority: input.authority,
    governanceState: input.governanceState,
    executionState: input.executionState,
    source: input.source,
    traceId: input.traceId,
    correlationId: input.correlationId,
    payload: input.payload,
    authorship: input.authorship,
    classification: input.classification,
  }),
): OrchestrationEnvelope {
  const protectedAction = isProtectedAction(input)
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
  const constitutionalSystems = toConstitutionalSystemStates(constitutional)
  const denialReason = envelopeDenialReason(legality, constitutional)
  const invocationOutput: OperatorInvocationOutput = {
    observations: [
      {
        code: constitutional.legitimacy === 'confirmed' ? 'constitutional-confirmed' : 'constitutional-blocked',
        detail: constitutional.legitimacy === 'confirmed'
          ? `Constitutional path ${constitutional.constitutionalPath.join(' -> ')} confirmed legitimacy`
          : denialReason ?? 'Constitutional middleware blocked legitimacy',
      },
      {
        code: legality.allowed ? 'legality-allowed' : 'legality-blocked',
        detail: legality.allowed
          ? `${input.action} satisfied legality and authority checks`
          : denialReason ?? `${input.action} failed legality checks`,
      },
      {
        code: 'routing-selected',
        detail: routingPlan.explanation.summary,
      },
    ],
    recommendations: routingPlan.sequence.map((step) => ({
      action: step.action,
      operatorId: step.operatorId,
      rationale: routingPlan.explanation.selectedBecause[step.order - 1] ?? routingPlan.explanation.summary,
    })),
    blockers: denialReason ? [denialReason] : [],
    confidence: legality.allowed && constitutional.legalityConfirmed ? 0.93 : 0.41,
    governanceState: {
      current: legality.allowed && constitutional.legalityConfirmed ? input.governanceState : 'blocked',
      authority: input.authority,
      constitutionalSystems,
    },
    escalationRequired: legality.escalationRequired || constitutional.escalationRequired,
  }

  return {
    protectedAction,
    authorshipTrace: constitutional.authorshipTrace,
    lineageRef: constitutional.lineageRef,
    rightsValidation: constitutional.rightsValidation,
    legality,
    routingPlan,
    constitutionalSystems,
    invocationOutput,
  }
}

function toConstitutionalSystemStates(constitutional: ConstitutionalMiddlewareResult): ConstitutionalSystemState[] {
  return constitutional.constitutionalSystems.map((system) => ({
    id: system.id,
    role: 'constitutional-middleware',
    invoked: true,
    detail: system.reason,
  }))
}

function envelopeDenialReason(
  legality: LegalityCheckResult,
  constitutional?: ConstitutionalMiddlewareResult,
) {
  return constitutional?.blockingReason ?? constitutional?.rightsValidation?.denialReason ?? legality.denialReason
}

export async function orchestrateRuntimeAction(input: OrchestrationInput): Promise<OrchestrationResult> {
  const [{ bootstrapRuntimeSpine }, { enforceRuntimeAction }, { emitRuntimeEvent }] = await Promise.all([
    import('./bootstrap'),
    import('./garvis/enforcement'),
    import('./eventBus'),
  ])

  bootstrapRuntimeSpine()
  const constitutional = await invokeConstitutionalMiddleware({
    workspaceId: input.workspaceId,
    action: input.action,
    authority: input.authority,
    governanceState: input.governanceState,
    executionState: input.executionState,
    source: input.source,
    traceId: input.traceId,
    correlationId: input.correlationId,
    payload: input.payload,
    authorship: input.authorship,
    classification: input.classification,
  })
  const envelope = buildOrchestrationEnvelope(input, constitutional)
  const lineageId = constitutional.lineageRef.lineageId
  const eventPayload = {
    ...input.payload,
    action: input.action,
    operatorId: input.operatorId ?? envelope.routingPlan.selectedOperators[0] ?? 'unassigned-operator',
    threadId: input.threadId,
    entityId: input.entityId,
    projectId: input.projectId,
    linkedEntities: input.linkedEntities,
    parentLineageId: constitutional.lineageRef.parentId,
    authorshipTrace: envelope.authorshipTrace,
    lineageRef: envelope.lineageRef,
    rightsValidation: envelope.rightsValidation,
    constitutionalSystems: envelope.constitutionalSystems,
  }

  if (!constitutional.legalityConfirmed || constitutional.legitimacy !== 'confirmed') {
    return {
      routingPlan: envelope.routingPlan,
      legality: envelope.legality,
      enforcement: {
        allowed: false,
        reason: constitutional.blockingReason ?? envelope.legality.denialReason ?? 'Constitutional legitimacy blocked runtime invocation.',
        emittedEventIds: constitutional.emittedEventIds,
      },
      protectedAction: envelope.protectedAction,
      authorshipTrace: envelope.authorshipTrace,
      lineageRef: envelope.lineageRef,
      rightsValidation: envelope.rightsValidation,
      constitutionalSystems: envelope.constitutionalSystems,
      invocationOutput: envelope.invocationOutput,
    }
  }

  await emitRuntimeEvent({
    workspaceId: input.workspaceId,
    type: 'operator.invoked',
    source: input.source ?? 'operator',
    governanceState: input.governanceState,
    executionState: 'queued',
    traceId: input.traceId,
    correlationId: input.correlationId,
    lineageId,
    payloadType: 'operator.invocation',
    payload: {
      ...eventPayload,
      invokedBy: 'governed-runtime-orchestration',
      governancePath: envelope.routingPlan.explanation.governancePath,
    },
  })

  await emitRuntimeEvent({
    workspaceId: input.workspaceId,
    type: 'operator.analysis.completed',
    source: input.source ?? 'operator',
    governanceState: envelope.invocationOutput.governanceState.current,
    executionState: envelope.legality.allowed ? 'completed' : 'failed',
    traceId: input.traceId,
    correlationId: input.correlationId,
    lineageId,
    payloadType: 'operator.analysis',
    payload: {
      ...eventPayload,
      routingPlanId: envelope.routingPlan.id,
      selectedOperators: envelope.routingPlan.selectedOperators,
      sequence: envelope.routingPlan.sequence,
      rollbackClass: envelope.routingPlan.rollbackClass,
      escalationPath: envelope.routingPlan.escalationPath,
      governanceState: envelope.routingPlan.governanceState,
      legal: envelope.legality.allowed && constitutional.legalityConfirmed,
      explanation: envelope.routingPlan.explanation,
      requiredAuthority: envelope.legality.requiredAuthority,
      denialReason: constitutional.blockingReason ?? envelope.legality.denialReason,
      source: constitutional.rightsValidation ? 'pen-and-sword' : 'flightpath',
      output: envelope.invocationOutput,
    },
  })

  await emitRuntimeEvent({
    workspaceId: input.workspaceId,
    type: 'operator.recommendation.generated',
    source: input.source ?? 'operator',
    governanceState: envelope.invocationOutput.governanceState.current,
    executionState: envelope.legality.allowed ? 'queued' : 'failed',
    traceId: input.traceId,
    correlationId: input.correlationId,
    lineageId,
    payloadType: 'operator.recommendation',
    payload: {
      ...eventPayload,
      routingPlanId: envelope.routingPlan.id,
      output: envelope.invocationOutput,
    },
  })

  const enforcement = await enforceRuntimeAction({
    workspaceId: input.workspaceId,
    showId: input.showId,
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
      protected: constitutional.rightsValidation?.nilRestricted === true || constitutional.rightsValidation?.allowed === false,
      reason: constitutional.rightsValidation?.denialReason,
    },
  })

  if (enforcement.allowed) {
    await emitRuntimeEvent({
      workspaceId: input.workspaceId,
      type: 'operator.execution.approved',
      source: input.source ?? 'operator',
      governanceState: input.governanceState,
      executionState: 'queued',
      traceId: input.traceId,
      correlationId: input.correlationId,
      lineageId,
      payloadType: 'operator.execution',
      payload: {
        ...eventPayload,
        routingPlanId: envelope.routingPlan.id,
        selectedOperators: envelope.routingPlan.selectedOperators,
        output: envelope.invocationOutput,
      },
    })

    if (input.executionState === 'completed') {
      await emitRuntimeEvent({
        workspaceId: input.workspaceId,
        type: 'operator.execution.completed',
        source: input.source ?? 'operator',
        governanceState: input.governanceState,
        executionState: 'completed',
        traceId: input.traceId,
        correlationId: input.correlationId,
        lineageId,
        payloadType: 'operator.execution',
        payload: {
          ...eventPayload,
          routingPlanId: envelope.routingPlan.id,
          selectedOperators: envelope.routingPlan.selectedOperators,
          output: envelope.invocationOutput,
        },
      })
    }
  }

  return {
    routingPlan: envelope.routingPlan,
    legality: envelope.legality,
    enforcement,
    protectedAction: envelope.protectedAction,
    authorshipTrace: envelope.authorshipTrace,
    lineageRef: envelope.lineageRef,
    rightsValidation: envelope.rightsValidation,
    constitutionalSystems: envelope.constitutionalSystems,
    invocationOutput: envelope.invocationOutput,
  }
}
