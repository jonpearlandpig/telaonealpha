import { CONSTITUTIONAL_SYSTEM_IDS, type ConstitutionalLifecycleEventDescriptor, type ConstitutionalSystemId } from './constitutionalTypes'

export const CONSTITUTIONAL_EXECUTION_ORDER: readonly ConstitutionalSystemId[] = CONSTITUTIONAL_SYSTEM_IDS

export function getConstitutionalExecutionOrder(): readonly ConstitutionalSystemId[] {
  return CONSTITUTIONAL_EXECUTION_ORDER
}

export function constitutionalExecutesBeforeOperators(sequence: readonly string[]) {
  const firstOperatorIndex = sequence.findIndex((item) => item.startsWith('operator.'))
  const lastConstitutionalIndex = sequence.reduce((lastIndex, item, index) => item.startsWith('constitutional.') ? index : lastIndex, -1)

  if (firstOperatorIndex === -1 || lastConstitutionalIndex === -1) return true
  return lastConstitutionalIndex < firstOperatorIndex
}

export function sortConstitutionalLifecycle(descriptors: readonly ConstitutionalLifecycleEventDescriptor[]) {
  const rank: Record<ConstitutionalLifecycleEventDescriptor['type'], number> = {
    'constitutional.invoked': 0,
    'constitutional.validated': 1,
    'constitutional.blocked': 2,
    'constitutional.legitimacy.confirmed': 3,
    'constitutional.audit.logged': 4,
    'constitutional.escalated': 5,
  }

  return [...descriptors].sort((left, right) => rank[left.type] - rank[right.type])
}
