import fs from 'fs'
import path from 'path'
import type { ApprovalBlock, BuildStatus, RuntimeProvider } from '../runtime/executor'

const LOG_PATH = path.resolve(process.cwd(), 'operator/logs/executions.jsonl')

export type ExecutionEvent = {
  event_id: string
  timestamp: string
  instruction_type: string
  instruction_source: 'telegram'
  runtime_provider: RuntimeProvider
  changed_files: string[]
  commit_hash: string | null
  build_status: BuildStatus
  deploy_status: 'none' | 'triggered' | 'failed'
  elapsed_ms: number
  error: string | null
  approval_blocks: ApprovalBlock[]
}

export function logExecution(event: ExecutionEvent): void {
  try {
    fs.appendFileSync(LOG_PATH, JSON.stringify(event) + '\n', 'utf8')
    if (event.approval_blocks.length > 0) {
      console.warn('[executionLog] approval blocks detected:')
      for (const block of event.approval_blocks) {
        console.warn(`  blocked: ${block.blockedCommand}`)
        console.warn(`  reason:  ${block.approvalReason}`)
        console.warn(`  action:  ${block.suggestedAction}`)
      }
    }
  } catch (err) {
    console.error('[executionLog] failed to write:', err)
  }
}

export function makeEventId(): string {
  return `exec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}
