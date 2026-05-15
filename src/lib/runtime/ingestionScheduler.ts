import { runRefreshPipeline } from '@/lib/ingestion/refreshPipeline'
import { shouldRetry } from '@/lib/ingestion/retryPolicy'
import { getQueuedJobs, updateIngestionJob } from './ingestionQueue'

export function processIngestionTick(): void {
  const job = getQueuedJobs()[0]
  if (!job) return
  const attempt = job.attempt + 1
  updateIngestionJob(job.id, { state: 'processing', attempt })
  const res = runRefreshPipeline(job)
  if (res.ok) updateIngestionJob(job.id, { state: 'completed', error: undefined })
  else {
    const next = { ...job, state: 'failed' as const, attempt }
    if (shouldRetry(next)) updateIngestionJob(job.id, { state: 'retrying', error: res.error })
    else updateIngestionJob(job.id, { state: 'failed', error: res.error })
  }
}
