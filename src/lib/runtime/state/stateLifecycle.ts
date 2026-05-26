import type { OperationalStateLifecycle } from './model'

export const OPERATIONAL_STATE_LIFECYCLE: OperationalStateLifecycle[] = [
  'entered',
  'acknowledged',
  'escalated',
  'resolved',
  'superseded',
  'expired',
]

export function initialLifecycleState(): OperationalStateLifecycle {
  return 'entered'
}
