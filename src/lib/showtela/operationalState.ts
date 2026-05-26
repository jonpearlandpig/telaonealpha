export type { OperationalStateRecord as OperationalState } from '@/lib/runtime/state/model'
export {
  getOperationalProjection,
  loadActiveOperationalStates,
  loadOperationalProjection,
  persistOperationalProjection,
} from '@/lib/runtime/state/stateProjectionStore'
