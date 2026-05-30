import { createAuthorshipTrace } from '@/lib/showtela/telauthorium'
import { createLineageRef, validateExecutionIntegrity } from '@/lib/showtela/penAndSword'
import type { ConstitutionalAuditTrace, ConstitutionalInput, ConstitutionalMiddlewareExecution, ConstitutionalMiddlewareResult } from './constitutionalTypes'
import { getConstitutionalExecutionOrder } from './constitutionalOrdering'

function isProtectedAction(input: ConstitutionalInput) {
  return input.authorship?.required === true ||
    input.classification?.creativeOutput === true ||
    input.classification?.sacredIp === true ||
    input.classification?.authorshipSensitive === true
}

function buildAuditTrace(input: ConstitutionalInput, constitutionalPath: readonly ConstitutionalMiddlewareExecution['id'][], timestamp: string): ConstitutionalAuditTrace {
  const auditKey = input.traceId ?? input.correlationId ?? input.authorship?.parentLineageId ?? input.action
  return {
    auditId: `audit:${input.workspaceId}:${auditKey}`,
    workspaceId: input.workspaceId,
    loggedAt: timestamp,
    constitutionalPath,
    trigger: input.triggerReason ?? `constitutional middleware required for ${input.action}`,
    traceId: input.traceId,
    correlationId: input.correlationId,
  }
}

export function executeConstitutionalMiddleware(input: ConstitutionalInput): ConstitutionalMiddlewareResult {
  const timestamp = input.timestamp ?? new Date().toISOString()
  const protectedAction = isProtectedAction(input)
  const constitutionalPath = getConstitutionalExecutionOrder()
  const authorshipTrace = createAuthorshipTrace({
    author: input.authorship?.author,
    surface: input.authorship?.surface ?? 'runtime',
    capturedAt: timestamp,
  })
  const lineageRef = createLineageRef({
    parentId: input.authorship?.parentLineageId,
    existingChain: input.authorship?.existingLineageChain,
  })
  const rightsValidation = protectedAction
    ? validateExecutionIntegrity({
        rightsInheritance: input.authorship?.rightsInheritance,
        nilRestricted: input.authorship?.nilRestricted,
        nilReason: input.authorship?.nilReason,
        authority: input.authority,
        governanceState: input.governanceState,
      })
    : undefined

  const legalityConfirmed = rightsValidation ? rightsValidation.allowed : input.governanceState !== 'blocked'
  const blockingReason = rightsValidation?.denialReason ?? (input.governanceState === 'blocked' ? 'Governance state blocks constitutional legitimacy.' : undefined)
  const legitimacy = legalityConfirmed ? 'confirmed' : 'blocked'
  const escalationRequired = legitimacy === 'blocked'
  const auditTrace = buildAuditTrace(input, constitutionalPath, timestamp)
  const constitutionalSystems: ConstitutionalMiddlewareExecution[] = [
    {
      id: 'telauthorium',
      executed: true,
      reason: protectedAction ? 'Authorship surface captured before runtime invocation.' : 'Invocation authorship was recorded before runtime invocation.',
    },
    {
      id: 'pen-and-sword',
      executed: true,
      reason: protectedAction ? 'Rights and lineage integrity evaluated deterministically.' : 'Lineage continuity was prepared deterministically.',
    },
    {
      id: 'the-ledger',
      executed: true,
      reason: 'Replay-safe audit trace prepared before operator invocation.',
    },
  ]

  return {
    legitimacy,
    rightsValidation,
    governanceState: legitimacy === 'confirmed' ? input.governanceState : 'blocked',
    constitutionalPath,
    auditTrace,
    escalationRequired,
    blockingReason,
    legalityConfirmed,
    legalityState: legalityConfirmed ? 'confirmed' : 'failed',
    escalationState: escalationRequired ? 'required' : 'none',
    authorshipTrace,
    lineageRef,
    constitutionalSystems,
  }
}
