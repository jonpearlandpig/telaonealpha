import { buildCanonicalObjectsFromReplay } from '../objects/objectReplayPromotion'
import type { CanonicalOperationalObject } from '../objects/operationalObjects'
import type { RuntimeEvent } from '../runtimeTypes'
import { createRestorationSnapshot, type RestorationSnapshot } from './restorationSnapshot'

export type ReplayConvergenceVerification = {
  firstSnapshot: RestorationSnapshot
  secondSnapshot: RestorationSnapshot
  replayChecksum: string
  restorationChecksum: string
  replayConverged: boolean
  hydrationPassCount: number
  replayDriftDetected: boolean
  deterministicRestoration: boolean
  reconciliationConflictCount: number
  identityStable: boolean
  reconciliationStable: boolean
  ontologyStable: boolean
  lineageStable: boolean
  confirmationStable: boolean
  checksumEqual: boolean
}

export function verifyReplayConvergence(input: {
  workspaceId: string
  events: RuntimeEvent[]
  passCount?: number
}): ReplayConvergenceVerification {
  const firstObjects = buildCanonicalObjectsFromReplay(input.workspaceId, input.events)
  const secondObjects = buildCanonicalObjectsFromReplay(input.workspaceId, input.events)
  const firstSnapshot = createRestorationSnapshot({
    workspaceId: input.workspaceId,
    canonicalObjects: firstObjects,
  })
  const secondSnapshot = createRestorationSnapshot({
    workspaceId: input.workspaceId,
    canonicalObjects: secondObjects,
  })

  const identityStable = buildIdentitySignature(firstObjects) === buildIdentitySignature(secondObjects)
  const reconciliationStable =
    buildReconciliationSignature(firstObjects) === buildReconciliationSignature(secondObjects)
  const ontologyStable = buildOntologySignature(firstObjects) === buildOntologySignature(secondObjects)
  const lineageStable = buildLineageSignature(firstObjects) === buildLineageSignature(secondObjects)
  const confirmationStable =
    buildConfirmationSignature(firstObjects) === buildConfirmationSignature(secondObjects)
  const checksumEqual = firstSnapshot.deterministicChecksum === secondSnapshot.deterministicChecksum
  const replayConverged =
    identityStable &&
    reconciliationStable &&
    ontologyStable &&
    lineageStable &&
    confirmationStable &&
    checksumEqual

  return {
    firstSnapshot,
    secondSnapshot,
    replayChecksum: firstSnapshot.deterministicChecksum,
    restorationChecksum: secondSnapshot.deterministicChecksum,
    replayConverged,
    hydrationPassCount: input.passCount ?? 2,
    replayDriftDetected: !replayConverged,
    deterministicRestoration: replayConverged,
    reconciliationConflictCount: secondSnapshot.reconciliationConflictCount,
    identityStable,
    reconciliationStable,
    ontologyStable,
    lineageStable,
    confirmationStable,
    checksumEqual,
  }
}

export async function verifyHydrationIdempotence<TState extends {
  diagnostics?: {
    restorationChecksum?: string
  }
}>(input: {
  workspaceId: string
  hydrate: (workspaceId: string) => Promise<TState> | TState
  passCount?: number
}): Promise<{
  replayConverged: boolean
  hydrationPassCount: number
  replayDriftDetected: boolean
  restorationChecksums: string[]
}> {
  const passCount = input.passCount ?? 2
  const states: TState[] = []

  for (let index = 0; index < passCount; index += 1) {
    states.push(await input.hydrate(input.workspaceId))
  }

  const restorationChecksums = states.map((state) => state.diagnostics?.restorationChecksum ?? '')
  const first = restorationChecksums[0] ?? ''
  const replayConverged = restorationChecksums.every((checksum) => checksum === first)

  return {
    replayConverged,
    hydrationPassCount: passCount,
    replayDriftDetected: !replayConverged,
    restorationChecksums,
  }
}

function buildIdentitySignature(objects: CanonicalOperationalObject[]): string {
  return [...objects]
    .map((object) => object.id)
    .sort()
    .join('|')
}

function buildReconciliationSignature(objects: CanonicalOperationalObject[]): string {
  return [...objects]
    .map((object) => `${object.id}:${String(object.payload.reconciliationDecision ?? 'same-object')}`)
    .sort()
    .join('|')
}

function buildOntologySignature(objects: CanonicalOperationalObject[]): string {
  return [...objects]
    .map((object) => `${object.id}:${String(object.payload.canonicalType ?? object.objectType)}`)
    .sort()
    .join('|')
}

function buildLineageSignature(objects: CanonicalOperationalObject[]): string {
  return [...objects]
    .map((object) => `${object.id}:${object.lineageId ?? ''}`)
    .sort()
    .join('|')
}

function buildConfirmationSignature(objects: CanonicalOperationalObject[]): string {
  return [...objects]
    .map(
      (object) =>
        `${object.id}:${object.replayConfirmed ? '1' : '0'}:${object.lastConfirmedSequence ?? 'none'}`,
    )
    .sort()
    .join('|')
}
