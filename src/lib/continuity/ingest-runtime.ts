import type { ContinuityEvent } from '@/lib/showtela/types'
import { getShowTelaHome } from '@/lib/showtela/hydration'
import { ingestShowTelaContinuity } from '@/lib/showtela/runtimeContinuity'
import { writeShowTelaCache } from '@/lib/supabase/operationalCache'
import type {
  ContinuityIngestionInput,
  NormalizeContinuityIngestionOptions,
} from './normalize-ingestion'

export async function ingestCanonicalContinuity(
  input: ContinuityIngestionInput,
  options?: NormalizeContinuityIngestionOptions,
): Promise<{
  event: ContinuityEvent
  insertedId?: string
  lineageId: string
  data: Awaited<ReturnType<typeof getShowTelaHome>>
}> {
  const baseData = await getShowTelaHome()
  const result = await ingestShowTelaContinuity({
    baseData,
    payload: input,
    submittedBy: options?.author ?? input.owner ?? 'Operations',
  })
  await writeShowTelaCache(result.data)

  return {
    event: result.event,
    insertedId: result.event.id,
    lineageId: result.event.lineageRef?.lineageId ?? result.ocid,
    data: result.data,
  }
}

export function extractInboxTitle(property: unknown) {
  return ((property as { title?: Array<{ plain_text?: string }> } | undefined)?.title ?? [])
    .map((item) => item.plain_text ?? '')
    .join('')
}

export function extractInboxRichText(property: unknown) {
  return ((property as { rich_text?: Array<{ plain_text?: string }> } | undefined)?.rich_text ?? [])
    .map((item) => item.plain_text ?? '')
    .join('')
}

export function extractInboxSelect(property: unknown) {
  return (property as { select?: { name?: string } } | undefined)?.select?.name ?? ''
}

export function resolveInboxDatabaseId() {
  return process.env.NOTION_CRUSADE_INBOX_DB_ID ?? process.env.NOTION_SHOWTELA_INBOX_DB_ID
}
