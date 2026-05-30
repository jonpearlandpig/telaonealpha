import type { ConstitutionalLifecycleEventDescriptor, ConstitutionalMiddlewareResult } from './constitutionalTypes'
import { sortConstitutionalLifecycle } from './constitutionalOrdering'

export function buildConstitutionalLifecycle(result: ConstitutionalMiddlewareResult): ConstitutionalLifecycleEventDescriptor[] {
  const descriptors: ConstitutionalLifecycleEventDescriptor[] = [
    {
      type: 'constitutional.invoked',
      payloadType: 'constitutional.invocation',
      governanceState: result.governanceState,
      executionState: 'queued',
    },
    result.legalityConfirmed
      ? {
          type: 'constitutional.validated',
          payloadType: 'constitutional.validation',
          governanceState: result.governanceState,
          executionState: 'completed',
        }
      : {
          type: 'constitutional.blocked',
          payloadType: 'constitutional.blocked',
          governanceState: 'blocked',
          executionState: 'failed',
        },
    {
      type: 'constitutional.audit.logged',
      payloadType: 'constitutional.audit',
      governanceState: result.governanceState,
      executionState: 'completed',
    },
  ]

  if (result.legitimacy === 'confirmed') {
    descriptors.push({
      type: 'constitutional.legitimacy.confirmed',
      payloadType: 'constitutional.legitimacy',
      governanceState: result.governanceState,
      executionState: 'completed',
    })
  }

  if (result.escalationRequired) {
    descriptors.push({
      type: 'constitutional.escalated',
      payloadType: 'constitutional.escalation',
      governanceState: 'escalated',
      executionState: 'failed',
    })
  }

  return sortConstitutionalLifecycle(descriptors)
}
