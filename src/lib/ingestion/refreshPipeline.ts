import type { IngestionJob } from './jobState'
import { ingestNotionOperationalObject } from './notionIngest'

export function runRefreshPipeline(job: IngestionJob): { ok: boolean; outputRef?: string; error?: string } {
  try {
    const output = ingestNotionOperationalObject({ pageId: job.payloadRef, title: job.source, content: `refresh ${job.payloadRef}`, threadRef: 'chat-main' })
    return { ok: true, outputRef: output.akbObjectId }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}
