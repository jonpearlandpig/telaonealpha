import { buildCanonicalObjectsFromReplay } from '../objects/objectReplayPromotion'
import type { CanonicalOperationalObject } from '../objects/operationalObjects'
import type { RuntimeEvent } from '../runtimeTypes'
import { verifyReplayConvergence } from './replayConvergence'

export type ConvergenceInspection = {
  failedConvergenceObjectIds: string[]
  reconciliationSplitObjectIds: string[]
  divergedLineageIds: string[]
  driftReplaySequences: number[]
  unresolvedGapObjectIds: string[]
}

export function inspectReplayConvergence(input: {
  workspaceId: string
  events: RuntimeEvent[]
}): ConvergenceInspection {
  const convergence = verifyReplayConvergence(input)
  const firstObjects = buildCanonicalObjectsFromReplay(input.workspaceId, input.events)
  const secondObjects = buildCanonicalObjectsFromReplay(input.workspaceId, input.events)
  const firstById = new Map(firstObjects.map((object) => [object.id, object]))
  const secondById = new Map(secondObjects.map((object) => [object.id, object]))
  const allIds = Array.from(new Set([...firstById.keys(), ...secondById.keys()])).sort()

  const failedConvergenceObjectIds = allIds.filter((id) => {
    const first = firstById.get(id)
    const second = secondById.get(id)
    if (!first || !second) return true
    return objectSignature(first) !== objectSignature(second)
  })

  const reconciliationSplitObjectIds = secondObjects
    .filter(
      (object) =>
        object.id.includes('::conflict::') ||
        object.payload.reconciliationDecision === 'conflicting-object',
    )
    .map((object) => object.id)
    .sort()

  const divergedLineageIds = allIds
    .map((id) => {
      const first = firstById.get(id)
      const second = secondById.get(id)
      if (!first || !second) return first?.lineageId ?? second?.lineageId ?? null
      if ((first.lineageId ?? null) !== (second.lineageId ?? null)) {
        return second.lineageId ?? first.lineageId ?? null
      }
      return null
    })
    .filter((value): value is string => typeof value === 'string')

  const driftReplaySequences = allIds
    .flatMap((id) => {
      const first = firstById.get(id)
      const second = secondById.get(id)
      if (!first || !second) {
        return [first?.lastConfirmedSequence, second?.lastConfirmedSequence]
      }
      return first.lastConfirmedSequence !== second.lastConfirmedSequence
        ? [first.lastConfirmedSequence, second.lastConfirmedSequence]
        : []
    })
    .filter((value): value is number => typeof value === 'number')
    .sort((left, right) => left - right)

  const unresolvedGapObjectIds = secondObjects
    .filter((object) => !object.replayConfirmed)
    .map((object) => object.id)
    .sort()

  void convergence

  return {
    failedConvergenceObjectIds,
    reconciliationSplitObjectIds,
    divergedLineageIds,
    driftReplaySequences,
    unresolvedGapObjectIds,
  }
}

function objectSignature(object: CanonicalOperationalObject): string {
  return JSON.stringify({
    id: object.id,
    canonicalType: object.payload.canonicalType ?? object.objectType,
    lineageId: object.lineageId ?? null,
    lastConfirmedSequence: object.lastConfirmedSequence ?? null,
    replayConfirmed: object.replayConfirmed,
    reconciliationDecision: object.payload.reconciliationDecision ?? null,
  })
}
