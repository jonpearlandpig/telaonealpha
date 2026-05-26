import crypto from 'crypto'

import { AUTHORITY_RANK, type AuthorityLevel } from '../runtime/actions'
import type { LineageRef } from './types'
import type { GovernanceState } from '../runtime/runtimeTypes'

export type { LineageRef }

export type RightsValidation = {
  allowed: boolean
  rightsInherited: boolean
  nilRestricted: boolean
  constitutionalAuthority: boolean
  denialReason?: string
}

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

export function validateExecutionIntegrity(params: {
  rightsInheritance?: readonly string[]
  nilRestricted?: boolean
  nilReason?: string
  authority: AuthorityLevel
  minimumAuthority?: AuthorityLevel
  governanceState: GovernanceState
}): RightsValidation {
  const rightsInherited = (params.rightsInheritance?.length ?? 0) > 0
  const nilRestricted = params.nilRestricted === true
  const minimumAuthority = params.minimumAuthority ?? 'S1'
  const constitutionalAuthority =
    AUTHORITY_RANK[params.authority] >= AUTHORITY_RANK[minimumAuthority] && params.governanceState !== 'blocked'

  if (nilRestricted) {
    return {
      allowed: false,
      rightsInherited,
      nilRestricted: true,
      constitutionalAuthority,
      denialReason: params.nilReason ?? 'NIL restriction blocks execution.',
    }
  }

  if (!rightsInherited) {
    return {
      allowed: false,
      rightsInherited: false,
      nilRestricted: false,
      constitutionalAuthority,
      denialReason: 'Rights inheritance is required before execution.',
    }
  }

  if (!constitutionalAuthority) {
    return {
      allowed: false,
      rightsInherited,
      nilRestricted: false,
      constitutionalAuthority: false,
      denialReason: 'Constitutional authority is insufficient for execution.',
    }
  }

  return {
    allowed: true,
    rightsInherited: true,
    nilRestricted: false,
    constitutionalAuthority: true,
  }
}
