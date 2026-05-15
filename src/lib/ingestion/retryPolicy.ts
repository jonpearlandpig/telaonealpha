import type { IngestionJob } from './jobState'

export function shouldRetry(job: IngestionJob): boolean {
  return job.attempt < job.maxAttempts && (job.state === 'failed' || job.state === 'retrying')
}

export function nextRetryDelayMs(attempt: number): number {
  return Math.min(30000, 500 * 2 ** Math.max(0, attempt - 1))
}
