import crypto from 'crypto'

import { ACTIONS, type AuthorityLevel, type RuntimeAction } from '../actions'
import { emitRuntimeEvent } from '../eventBus'
import { evaluateActionLegality } from '../flightpath/legalityEngine'
import { isOperatorAuthorized } from '../operators/registry'
import type { EnforcementResult, ExecutionState, GovernanceState, RuntimeEvent, RuntimeEventPayload, RuntimeEventSource } from '../runtimeTypes'

export type EscalationEvent = {
  id: string
  action: string
  operatorId?: string
  blockers: string[]
  escalateTo: AuthorityLevel
  workspaceId: string
  showId: string
  timestamp: string
  resolved: boolean
}

type EnforcementInput = {
  workspaceId?: string
  showId?: string
  action: RuntimeAction
  governanceState: GovernanceState
  executionState: ExecutionState
  authority: AuthorityLevel
  traceId?: string
  correlationId?: string
  lineageId?: string
  source?: RuntimeEventSource
  operatorId?: string
  previousAction?: RuntimeAction
  twoKey?: {
    required: boolean
    approvedBy?: string[]
    minimumApprovers?: number
    requiredApprovers?: string[]
    requiredAuthorityAlignment?: AuthorityLevel[]
  }
  nilProtection?: {
    protected: boolean
    reason?: string
  }
}

type TwoKeyResult = {
  satisfied: boolean
  blockers: string[]
  approvedBy: string[]
}

type NilProtectionResult = {
  blocked: boolean
  blockers: string[]
  escalateTo: AuthorityLevel
}

const NIL_ACTIONS = new Set<RuntimeAction>([
  ACTIONS.TRANSFER_NIL,
  ACTIONS.ASSIGN_NIL,
  ACTIONS.SUBLICENSE_NIL,
  ACTIONS.DELEGATE_NIL_RIGHTS,
])

const TWO_KEY_ACTIONS = new Set<RuntimeAction>([
  ACTIONS.FINANCIAL_COMMITMENT,
  ACTIONS.RIGHTS_ASSIGNMENT,
  ACTIONS.CONTRACT_EXECUTION,
  ACTIONS.DEAL_SIGNING,
])

const DEFAULT_SHOW_ID = 'showtela'
const DEFAULT_TWO_KEY_APPROVERS = ['Nathan Jon']
const DEFAULT_TWO_KEY_ALIGNMENT: AuthorityLevel[] = ['S1', 'S2']
const activeEscalations: EscalationEvent[] = []

declare global {
  var __telaActiveEscalationCache: EscalationEvent[] | undefined
}

function escalationCache() {
  if (!globalThis.__telaActiveEscalationCache) {
    globalThis.__telaActiveEscalationCache = activeEscalations
  }
  return globalThis.__telaActiveEscalationCache
}

function normalizeApprovedBy(values: string[] | undefined) {
  return (values ?? []).map((value) => value.trim()).filter(Boolean)
}

function normalizeAuthorityToken(value: string) {
  return value.trim().toUpperCase()
}

function isGovernanceBlock(governanceState: GovernanceState, reason?: string) {
  return governanceState === 'blocked' || Boolean(reason?.includes('governance state'))
}

function requiresTwoKey(input: EnforcementInput) {
  return input.twoKey?.required === true || TWO_KEY_ACTIONS.has(input.action)
}

export function enforceTwoKeyProtocol(input: EnforcementInput): TwoKeyResult {
  if (!requiresTwoKey(input)) {
    return { satisfied: true, blockers: [], approvedBy: normalizeApprovedBy(input.twoKey?.approvedBy) }
  }

  const approvedBy = normalizeApprovedBy(input.twoKey?.approvedBy)
  const requiredApprovers = input.twoKey?.requiredApprovers ?? DEFAULT_TWO_KEY_APPROVERS
  const requiredAlignment = input.twoKey?.requiredAuthorityAlignment ?? DEFAULT_TWO_KEY_ALIGNMENT
  const minimumApprovers = input.twoKey?.minimumApprovers ?? 2

  const missingApprovers = requiredApprovers.filter((approver) => !approvedBy.some((value) => value.toLowerCase() === approver.toLowerCase()))
  const aligned = approvedBy.some((value) => requiredAlignment.includes(normalizeAuthorityToken(value) as AuthorityLevel))
  const blockers = [
    ...missingApprovers.map((approver) => `Missing required approver ${approver}.`),
    ...(aligned ? [] : [`Missing required authority alignment ${requiredAlignment.join('/')} for ${input.action}.`]),
    ...(approvedBy.length >= minimumApprovers ? [] : [`Two-Key protocol requires at least ${minimumApprovers} aligned approvals for ${input.action}.`]),
  ]

  return {
    satisfied: blockers.length === 0,
    blockers,
    approvedBy,
  }
}

export function enforceNILProtection(input: EnforcementInput): NilProtectionResult {
  const nilProtected = input.nilProtection?.protected === true || NIL_ACTIONS.has(input.action)
  if (!nilProtected) {
    return { blocked: false, blockers: [], escalateTo: 'S0' }
  }

  const reason = input.nilProtection?.reason ?? 'Juan Otero remains the sole NIL holder.'
  return {
    blocked: true,
    blockers: [reason],
    escalateTo: 'S0',
  }
}

function toEscalationEvent(event: RuntimeEvent): EscalationEvent | null {
  if (event.type !== 'operator.escalated' && event.type !== 'governance.escalation.propagated') return null
  const payload = (event.payload ?? {}) as Record<string, unknown>
  const blockers = Array.isArray(payload.blockers) ? payload.blockers.filter((value): value is string => typeof value === 'string') : []
  const escalateTo = typeof payload.escalateTo === 'string' ? payload.escalateTo as AuthorityLevel : 'S3'
  const workspaceId = event.workspaceId
  const showId = typeof payload.showId === 'string' ? payload.showId : DEFAULT_SHOW_ID

  if (!workspaceId) return null

  return {
    id: typeof payload.escalationId === 'string' ? payload.escalationId : event.id,
    action: typeof payload.action === 'string' ? payload.action : event.type,
    operatorId: typeof payload.operatorId === 'string' ? payload.operatorId : undefined,
    blockers,
    escalateTo,
    workspaceId,
    showId,
    timestamp: event.createdAt,
    resolved: false,
  }
}

export function reconstructActiveEscalations(events: RuntimeEvent[]): EscalationEvent[] {
  const ordered = [...events].sort((left, right) => (left.replaySequence ?? 0) - (right.replaySequence ?? 0))
  const active = new Map<string, EscalationEvent>()

  for (const event of ordered) {
    const escalation = toEscalationEvent(event)
    if (escalation) {
      active.set(escalation.id, escalation)
      continue
    }

    if (event.type !== 'governance.escalation.resolved') continue
    const payload = (event.payload ?? {}) as Record<string, unknown>
    const escalationId = typeof payload.escalationId === 'string' ? payload.escalationId : undefined
    if (escalationId) active.delete(escalationId)
  }

  return [...active.values()].sort((left, right) => left.timestamp.localeCompare(right.timestamp))
}

function syncEscalationCache(events: EscalationEvent[]) {
  const cache = escalationCache()
  cache.splice(0, cache.length, ...events)
}

async function bootstrapSpine() {
  const { bootstrapRuntimeSpine } = await import('../bootstrap')
  bootstrapRuntimeSpine()
}

export async function propagateEscalation(input: {
  workspaceId: string
  showId?: string
  action: RuntimeAction | string
  operatorId?: string
  blockers: string[]
  escalateTo: AuthorityLevel
  traceId?: string
  correlationId?: string
  lineageId?: string
  source?: RuntimeEventSource
  escalationId?: string
  payloadType?: string
  extraPayload?: Record<string, unknown>
}) {
  await bootstrapSpine()
  const event = await emitRuntimeEvent({
    workspaceId: input.workspaceId,
    type: 'governance.escalation.propagated',
    source: input.source ?? 'operator',
    governanceState: 'escalated',
    executionState: 'failed',
    traceId: input.traceId,
    correlationId: input.correlationId,
    lineageId: input.lineageId,
    payloadType: input.payloadType ?? 'governance.escalation',
    payload: {
      escalationId: input.escalationId ?? crypto.randomUUID(),
      action: input.action,
      operatorId: input.operatorId,
      blockers: input.blockers,
      escalateTo: input.escalateTo,
      showId: input.showId ?? DEFAULT_SHOW_ID,
      resolved: false,
      timestamp: new Date().toISOString(),
      ...input.extraPayload,
    },
  })

  const { getAllReplayEventsForWorkspace } = await import('../eventStore')
  syncEscalationCache(reconstructActiveEscalations([...(await getAllReplayEventsForWorkspace(input.workspaceId)), event]))
  return event
}

export async function resolveEscalation(input: {
  workspaceId: string
  escalationId: string
  action: RuntimeAction | string
  operatorId?: string
  resolution: string
  traceId?: string
  correlationId?: string
  lineageId?: string
  source?: RuntimeEventSource
}) {
  await bootstrapSpine()
  const event = await emitRuntimeEvent({
    workspaceId: input.workspaceId,
    type: 'governance.escalation.resolved',
    source: input.source ?? 'operator',
    governanceState: 'approved',
    executionState: 'completed',
    traceId: input.traceId,
    correlationId: input.correlationId,
    lineageId: input.lineageId,
    payloadType: 'governance.escalation',
    payload: {
      escalationId: input.escalationId,
      action: input.action,
      operatorId: input.operatorId,
      resolution: input.resolution,
      resolved: true,
      resolvedAt: new Date().toISOString(),
    },
  })

  const { getAllReplayEventsForWorkspace } = await import('../eventStore')
  syncEscalationCache(reconstructActiveEscalations([...(await getAllReplayEventsForWorkspace(input.workspaceId)), event]))
  return event
}

export async function getActiveEscalations(workspaceId: string) {
  const { getAllReplayEventsForWorkspace } = await import('../eventStore')
  const events = await getAllReplayEventsForWorkspace(workspaceId)
  const escalations = reconstructActiveEscalations(events)
  syncEscalationCache(escalations)
  return escalations
}

async function emitEnforcementEvent(
  type: 'operator.blocked' | 'operator.escalated' | 'governance.nil.blocked' | 'governance.two-key.blocked',
  input: EnforcementInput,
  payloadType: string,
  payload: RuntimeEventPayload,
) {
  await bootstrapSpine()
  return emitRuntimeEvent({
    workspaceId: input.workspaceId,
    type,
    source: input.source ?? 'operator',
    governanceState: type.includes('blocked') ? 'blocked' : 'escalated',
    executionState: 'failed',
    traceId: input.traceId,
    correlationId: input.correlationId,
    lineageId: input.lineageId,
    payloadType,
    payload,
  })
}

export async function enforceRuntimeAction(input: EnforcementInput): Promise<EnforcementResult> {
  const legality = evaluateActionLegality({
    action: input.action,
    governanceState: input.governanceState,
    executionState: input.executionState,
    authority: input.authority,
    previousAction: input.previousAction,
  })
  const emittedEventIds: string[] = []
  const operatorAuthorized = input.operatorId
    ? isOperatorAuthorized({
        operatorId: input.operatorId,
        action: input.action,
        authority: input.authority,
        governanceState: input.governanceState,
      })
    : true
  const nilResult = enforceNILProtection(input)
  const twoKeyResult = enforceTwoKeyProtocol(input)
  const shouldBlockForConstitution = !operatorAuthorized || !twoKeyResult.satisfied || nilResult.blocked

  if (legality.allowed && !shouldBlockForConstitution) {
    return { allowed: true, emittedEventIds }
  }

  const denialReason =
    (!operatorAuthorized && `Operator ${input.operatorId} is not authorized for ${input.action}.`) ||
    (!twoKeyResult.satisfied && twoKeyResult.blockers.join(' ')) ||
    (nilResult.blocked && nilResult.blockers.join(' ')) ||
    legality.denialReason ||
    `Execution denied for ${input.action}.`

  const blockers = [
    ...(operatorAuthorized ? [] : [`Operator ${input.operatorId} is not authorized for ${input.action}.`]),
    ...twoKeyResult.blockers,
    ...nilResult.blockers,
    ...(legality.denialReason && legality.denialReason !== denialReason ? [legality.denialReason] : []),
  ]
  const governanceBlocked = isGovernanceBlock(input.governanceState, denialReason) || !legality.allowed || shouldBlockForConstitution

  if (governanceBlocked) {
    const blocked = await emitEnforcementEvent('operator.blocked', input, 'operator.blocked', {
      action: input.action,
      operatorId: input.operatorId,
      requiredAuthority: legality.requiredAuthority,
      denialReason,
      blockers,
      governanceState: input.governanceState,
      twoKeyRequired: requiresTwoKey(input),
      approvedBy: twoKeyResult.approvedBy,
      nilProtected: nilResult.blocked,
    })
    emittedEventIds.push(blocked.id)
  }

  if (!twoKeyResult.satisfied) {
    const blocked = await emitEnforcementEvent('governance.two-key.blocked', input, 'governance.two-key', {
      action: input.action,
      operatorId: input.operatorId,
      denialReason,
      blockers: twoKeyResult.blockers,
      approvedBy: twoKeyResult.approvedBy,
      requiredAuthorityAlignment: input.twoKey?.requiredAuthorityAlignment ?? DEFAULT_TWO_KEY_ALIGNMENT,
    })
    emittedEventIds.push(blocked.id)
  }

  if (nilResult.blocked) {
    const blocked = await emitEnforcementEvent('governance.nil.blocked', input, 'governance.nil', {
      action: input.action,
      operatorId: input.operatorId,
      denialReason,
      blockers: nilResult.blockers,
      nilHolder: 'Juan Otero',
      escalationTarget: nilResult.escalateTo,
    })
    emittedEventIds.push(blocked.id)
  }

  if (legality.escalationRequired || !twoKeyResult.satisfied || nilResult.blocked) {
    const escalation = await emitEnforcementEvent('operator.escalated', input, 'operator.escalated', {
      escalationId: crypto.randomUUID(),
      action: input.action,
      operatorId: input.operatorId,
      reason: denialReason,
      blockers,
      escalateTo: nilResult.blocked ? nilResult.escalateTo : 'S3',
      showId: input.showId ?? DEFAULT_SHOW_ID,
      escalationPath: ['garvis-enforcement', 'runtime-governance-lead', 'sovereign-authority'],
      twoKeyRequired: requiresTwoKey(input),
      approvedBy: twoKeyResult.approvedBy,
      nilProtected: nilResult.blocked,
    })
    emittedEventIds.push(escalation.id)

    if (input.workspaceId) {
      const propagated = await propagateEscalation({
        workspaceId: input.workspaceId,
        showId: input.showId,
        action: input.action,
        operatorId: input.operatorId,
        blockers: blockers.length > 0 ? blockers : [denialReason],
        escalateTo: nilResult.blocked ? nilResult.escalateTo : 'S3',
        traceId: input.traceId,
        correlationId: input.correlationId,
        lineageId: input.lineageId,
        source: input.source,
        escalationId: typeof escalation.payload?.escalationId === 'string' ? escalation.payload.escalationId : undefined,
      })
      emittedEventIds.push(propagated.id)
    }
  }

  return {
    allowed: false,
    reason: denialReason,
    emittedEventIds,
  }
}
