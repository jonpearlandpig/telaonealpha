import crypto from 'crypto'

import type { LineageRef } from './types'

export type { LineageRef }

export function createLineageRef(params: {
  parentId?: string
  existingChain?: readonly string[]
}): LineageRef {
  const lineageId = `lref_${crypto.randomUUID()}`
  const chain = Object.freeze([...(params.existingChain ?? []), lineageId]) as readonly string[]
  return {
    lineageId,
    parentId: params.parentId,
    chain,
    capturedAt: new Date().toISOString(),
  }
}
