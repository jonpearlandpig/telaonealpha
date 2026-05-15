import { processIngestionTick } from '@/lib/runtime/ingestionScheduler'

export function runIngestionWorkerTick() {
  processIngestionTick()
}
