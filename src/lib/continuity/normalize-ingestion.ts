import type { ContinuityEvent } from '@/lib/showtela/types'
import { createAuthorshipTrace } from '@/lib/showtela/telauthorium'
import { createLineageRef } from '@/lib/showtela/penAndSword'
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
  author?: string
  continuityObjectId?: string
  eventId?: string
  existingLineageChain?: readonly string[]
  lineageParentId?: string
  timestamp?: string
}

export function normalizeContinuityIngestion(
  input: ContinuityIngestionInput,
  options?: NormalizeContinuityIngestionOptions,
): ContinuityEvent {
  const owner = input.owner?.trim()
  const operation = input.operation?.trim()
  const linkedEntity = input.linkedEntity?.trim()
  const body = input.body?.trim() ?? ''
  const assetNames = Array.from(new Set((input.assetNames ?? []).map((name) => name.trim()).filter(Boolean)))
  const linkUrl = input.linkUrl?.trim()
  const normalizedTags = Array.from(
    new Set(
      (input.tags ?? [])
        .map((tag) => tag.trim())
        .filter(Boolean)
        .map((tag) => tag.toUpperCase()),
    ),
  )

  const generatedHeadline =
    input.mode === 'voice-note'
      ? `Voice note from ${owner || 'the field'}`
      : input.mode === 'upload-files'
        ? `${assetNames.length || 1} file${assetNames.length === 1 ? '' : 's'} added to continuity`
        : input.mode === 'add-photos'
          ? `${assetNames.length || 1} photo${assetNames.length === 1 ? '' : 's'} added to continuity`
          : input.mode === 'add-link'
            ? 'Link added to continuity'
            : input.mode === 'paste-notes'
              ? 'Notes added to continuity'
              : 'Operational update captured'

  const headline = input.headline?.trim() || generatedHeadline
  const linkedRefs = [linkedEntity, operation].filter(Boolean) as string[]
  const uppercaseRefs = linkedRefs.map((ref) => ref.toUpperCase())
  const tags = Array.from(new Set([input.mode.replace('-', ' ').toUpperCase(), ...uppercaseRefs, ...normalizedTags]))
  const what = [headline, body, linkUrl, assetNames.join(', ')].filter(Boolean).join(' · ')
  const timestamp = options?.timestamp ?? new Date().toISOString()
  const seed = timestamp.replace(/[^0-9]/g, '').slice(-10) || Date.now().toString()
  const eventId = options?.eventId ?? `local-${seed}`
  const continuityObjectId = options?.continuityObjectId ?? `continuity-${seed}`

  const attachments = assetNames.map((name, index) => ({
    id: `attachment-${seed}-${index}`,
    title: name,
    type: input.mode === 'add-photos' ? 'image' as const : 'pdf' as const,
    capturedAt: timestamp,
  }))

  return {
    id: eventId,
    headline,
    body,
    timestamp,
    tags,
    owner: owner ? { id: owner.toLowerCase().replace(/\s+/g, '-'), name: owner } : undefined,
    pressure: normalizedTags.includes('risk'.toUpperCase()) ? 'high' : 'medium',
    isNew: true,
    threadId: continuityObjectId,
    linkedEntities: linkedRefs,
    unresolvedDependencies: [],
    attachments: attachments.length ? attachments : undefined,
    continuityObject: {
      id: continuityObjectId,
      kind: input.mode,
      title: headline,
      summary: body || generatedHeadline,
      capturedAt: timestamp,
      provenance: {
        who: owner,
        what,
        when: timestamp,
        linkedEntity,
        linkedOperation: operation,
      },
      source: {
        mode: input.mode,
        linkUrl,
        assetNames: assetNames.length ? assetNames : undefined,
        notes: body || undefined,
      },
    },
    authorshipTrace: createAuthorshipTrace({
      author: options?.author ?? owner,
      surface: input.mode === 'voice-note' ? 'voice' : 'ingest',
      capturedAt: timestamp,
    }),
    lineageRef: createLineageRef({
      parentId: options?.lineageParentId,
      existingChain: options?.existingLineageChain,
    }),
    sourceMode: input.mode,
  }
}

export async function normalizeContinuityIngestionWithLLM(
  input: ContinuityIngestionInput,
  options?: NormalizeContinuityIngestionOptions,
): Promise<ContinuityEvent> {
  const base = normalizeContinuityIngestion(input, options)

  const fileContents = (input.assetContents ?? [])
    .map(f => f.content.trim())
    .filter(Boolean)

  const hasBody = Boolean(input.body?.trim())
  const hasFileContent = fileContents.length > 0
  if (!hasBody && !hasFileContent) return base

  const llm = await llmNormalize(
    input.body ?? '',
    input.mode,
    {
      owner: input.owner,
      operation: input.operation,
      linkedEntity: input.linkedEntity,
    },
    fileContents,
  )

  if (!llm) return base

  return {
    ...base,
    headline: llm.headline || base.headline,
    body: llm.summary || base.body,
    summary: llm.summary,
    rawTranscript: input.body,
    pressure: llm.pressure || base.pressure,
    tags: Array.from(new Set([...(base.tags ?? []), ...llm.tags])),
    nextActions: llm.nextActions,
    classification: llm.classification,
    linkedEntities: Array.from(new Set([...(base.linkedEntities ?? []), ...llm.entities])),
    confidence: llm.confidence,
    normalizedBy: 'claude',
    normalizationVersion: 'v1',
    sourceMode: input.mode,
  }
}
