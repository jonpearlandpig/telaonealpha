import type { ContinuityEvent } from '@/lib/showtela/types'

export type ContinuityIngestionMode =
  | 'voice-note'
  | 'quick-update'
  | 'upload-files'
  | 'paste-notes'
  | 'add-photos'
  | 'add-link'

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
}

export function normalizeContinuityIngestion(
  input: ContinuityIngestionInput,
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
  const timestamp = new Date().toISOString()

  const attachments = assetNames.map((name, index) => ({
    id: `attachment-${Date.now()}-${index}`,
    title: name,
    type: input.mode === 'add-photos' ? 'image' as const : 'pdf' as const,
    capturedAt: timestamp,
  }))

  return {
    id: `local-${Date.now()}`,
    headline,
    body,
    timestamp,
    tags,
    owner: owner ? { id: owner.toLowerCase().replace(/\s+/g, '-'), name: owner } : undefined,
    pressure: normalizedTags.includes('risk'.toUpperCase()) ? 'high' : 'medium',
    isNew: true,
    linkedEntities: linkedRefs,
    unresolvedDependencies: [],
    attachments: attachments.length ? attachments : undefined,
    continuityObject: {
      id: `continuity-${Date.now()}`,
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
  }
}
