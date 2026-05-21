import fs from 'fs'
import path from 'path'

const LOG_PATH = path.resolve(process.cwd(), 'operator/logs/executions.jsonl')

export type ExecutionEvent = {
  event_id: string
  timestamp: string
  instruction_type: string
  instruction_source: 'telegram'
  runtime_provider: 'claude-code'
  changed_files: string[]
  commit_hash: string | null
  build_status: 'unknown' | 'passed' | 'failed'
  deploy_status: 'none' | 'triggered' | 'failed'
  elapsed_ms: number
  error: string | null
}

export function logExecution(event: ExecutionEvent): void {
  try {
    fs.appendFileSync(LOG_PATH, JSON.stringify(event) + '\n', 'utf8')
  } catch (err) {
    console.error('[executionLog] failed to write:', err)
  }
}

export function makeEventId(): string {
  return `exec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}
