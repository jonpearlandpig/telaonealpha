import 'server-only'
import { createHash } from 'crypto'

import type { CreateConstitutionalEventInput } from './types'

export type ConstitutionalHashInput = Pick<
  CreateConstitutionalEventInput,
  'parent_event_id' | 'governance_state' | 'operator_overlays' | 'execution_state' | 'routing_metadata' | 'continuity_refs'
> & {
  schema_version: string
  timestamp: string
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable)
  if (!value || typeof value !== 'object') return value
  return Object.keys(value as Record<string, unknown>)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = stable((value as Record<string, unknown>)[key])
      return acc
    }, {})
}

export function createConstitutionalLineageHash(input: ConstitutionalHashInput) {
  const payload = {
    parent_event_id: input.parent_event_id ?? null,
    governance_state: input.governance_state ?? null,
    operator_overlays: stable(input.operator_overlays ?? []),
    execution_state: input.execution_state ?? null,
    routing_metadata: stable(input.routing_metadata ?? {}),
    continuity_refs: stable(input.continuity_refs ?? []),
    schema_version: input.schema_version,
    timestamp: input.timestamp,
  }

  return createHash('sha256').update(JSON.stringify(payload)).digest('hex')
}
