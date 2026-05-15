export type IngestionJobState = 'queued' | 'processing' | 'retrying' | 'completed' | 'failed' | 'stale'

export type IngestionJob = {
  id: string
  source: string
  payloadRef: string
  lineageId?: string
  createdAt: string
  updatedAt: string
  attempt: number
  maxAttempts: number
  state: IngestionJobState
  error?: string
}

const STORAGE_KEY = 'telaone_ingestion_jobs_v1'

export function loadIngestionJobs(): IngestionJob[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]') as IngestionJob[] } catch { return [] }
}

export function saveIngestionJobs(jobs: IngestionJob[]): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs))
}
