import type { ContinuityEvent } from '@/lib/showtela/types'
import { llmNormalize } from './llm-normalize'

export type ContinuityIngestionMode =
  | 'voice-note'
  | 'quick-update'
  | 'upload-files'
  | 'paste-notes'
  | 'add-photos'
  | 'add-link'

export type AssetContent = {
  name: string
  content: string
  type: string
}

export type ContinuityIngestionInput = {
  mode: ContinuityIngestionMode
  headline?: string
  body?: string
  owner?: string
  operation?: string
  linkedEntity?: string
  tags?: string[]
  linkUrl?: string
  assetNames?: string[]
  assetContents?: AssetContent[]
}

export type NormalizeContinuityIngestionOptions = {
  eventId?: string
  continuityObjectId?: string
  timestamp?: string
}

function dedupeUppercase(values: string[]) {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean)
        .map((value) => value.toUpperCase()),
    ),
  )
}

function baseHeadline(input: ContinuityIngestionInput) {
  if (input.headline?.trim()) return input.headline.trim()
  if (input.mode === 'voice-note') return `Voice note from ${input.owner?.trim() || 'the field'}`
  if (input.mode === 'upload-files') return `${Math.max(input.assetNames?.length ?? 0, 1)} file${(input.assetNames?.length ?? 0) === 1 ? '' : 's'} added to continuity`
  if (input.mode === 'add-photos') return `${Math.max(input.assetNames?.length ?? 0, 1)} photo${(input.assetNames?.length ?? 0) === 1 ? '' : 's'} added to continuity`
  if (input.mode === 'add-link') return 'Link added to continuity'
  if (input.mode === 'paste-notes') return 'Notes added to continuity'
  return 'Operational update captured'
}

export function normalizeContinuityIngestion(
  input: ContinuityIngestionInput,
  options?: NormalizeContinuityIngestionOptions,
): ContinuityEvent {
  const timestamp = options?.timestamp ?? new Date().toISOString()
  const seed = timestamp.replace(/[^0-9]/g, '').slice(-10) || Date.now().toString()
  const body = input.body?.trim() ?? ''
  const owner = input.owner?.trim()
  const linkedEntity = input.linkedEntity?.trim()
  const operation = input.operation?.trim()
  const headline = baseHeadline(input)
  const baseTags = dedupeUppercase([
    input.mode.replace('-', ' '),
    ...(input.tags ?? []),
    linkedEntity ?? '',
    operation ?? '',
  ])

  return {
    id: options?.eventId ?? `local-${seed}`,
    headline,
    body,
    rawTranscript: input.mode === 'voice-note' ? body : undefined,
    summary: undefined,
    timestamp,
    tags: baseTags,
    owner: owner ? { id: owner.toLowerCase().replace(/\s+/g, '-'), name: owner } : undefined,
    pressure: baseTags.includes('RISK') ? 'high' : 'medium',
    sourceMode: input.mode,
    isNew: true,
    threadId: options?.continuityObjectId ?? `continuity-${seed}`,
    linkedEntities: [linkedEntity, operation].filter(Boolean) as string[],
    unresolvedDependencies: [],
  }
}

export async function normalizeContinuityIngestionWithLLM(
  input: ContinuityIngestionInput,
  options?: NormalizeContinuityIngestionOptions,
): Promise<ContinuityEvent> {
  const base = normalizeContinuityIngestion(input, options)

  if (!input.body?.trim() || input.body.trim().length < 10) {
    return base
  }

  const llm = await llmNormalize(input.body, input.mode, {
    owner: input.owner,
    operation: input.operation,
    linkedEntity: input.linkedEntity,
  })

  if (!llm) return base

  return {
    ...base,
    headline: llm.headline || base.headline,
    summary: llm.summary,
    pressure: llm.pressure || base.pressure,
    classification: llm.classification,
    nextActions: llm.nextActions,
    confidence: llm.confidence,
    rawTranscript: input.body,
    tags: Array.from(new Set([...(base.tags ?? []), ...llm.tags])),
    normalizedBy: 'claude',
    normalizationVersion: 'v1',
  }
}
