import type { IngestionJob } from './jobState'

export function dedupeJobs(jobs: IngestionJob[]): IngestionJob[] {
  const byRef = new Map<string, IngestionJob>()
  for (const job of jobs) {
    const prev = byRef.get(job.payloadRef)
    if (!prev || new Date(job.updatedAt).getTime() > new Date(prev.updatedAt).getTime()) byRef.set(job.payloadRef, job)
  }
  return Array.from(byRef.values()).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
}
