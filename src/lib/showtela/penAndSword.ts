import type { LineageRef } from './types'

export type { LineageRef }

export function createLineageRef(params: {
  parentId?: string
  existingChain?: readonly string[]
}): LineageRef {
  const lineageId = `lref_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
  const chain = Object.freeze([...(params.existingChain ?? []), lineageId]) as readonly string[]
  return {
    lineageId,
    parentId: params.parentId,
    chain,
    capturedAt: new Date().toISOString(),
  }
}
