import { reconcileEntities } from '@/lib/runtime/entityReconciliation'
import type { EntityRecord } from '@/lib/entities/entityEngine'

export function runReconciliationWorker(entities: EntityRecord[]) {
  return reconcileEntities(entities)
}
