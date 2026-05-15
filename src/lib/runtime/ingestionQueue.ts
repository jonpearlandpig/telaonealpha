import { dedupeJobs } from '@/lib/ingestion/conflictResolution'
import { loadIngestionJobs, saveIngestionJobs, type IngestionJob } from '@/lib/ingestion/jobState'

function id(seed: string): string { return `job_${Math.abs(seed.split('').reduce((a,c)=>a+c.charCodeAt(0),0)).toString(36)}` }

export function enqueueIngestionJob(input: { source: string; payloadRef: string; lineageId?: string; maxAttempts?: number }): IngestionJob[] {
  const now = new Date().toISOString()
  const jobs = loadIngestionJobs()
  jobs.push({ id: id(`${input.payloadRef}|${now}`), source: input.source, payloadRef: input.payloadRef, lineageId: input.lineageId, createdAt: now, updatedAt: now, attempt: 0, maxAttempts: input.maxAttempts ?? 3, state: 'queued' })
  const next = dedupeJobs(jobs)
  saveIngestionJobs(next)
  return next
}

export function updateIngestionJob(jobId: string, patch: Partial<IngestionJob>): IngestionJob[] {
  const next = loadIngestionJobs().map((j) => j.id === jobId ? { ...j, ...patch, updatedAt: new Date().toISOString() } : j)
  saveIngestionJobs(next)
  return next
}

export function getQueuedJobs(): IngestionJob[] {
  return loadIngestionJobs().filter((j) => j.state === 'queued' || j.state === 'retrying').sort((a,b)=>new Date(a.createdAt).getTime()-new Date(b.createdAt).getTime())
}
