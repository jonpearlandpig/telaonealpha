import type { ArtifactEntity, ContinuityEvent, OperationEntity, PersonEntity, UnresolvedObject } from './types'

type NotionProperty = Record<string, unknown> | undefined
type NotionRecord = { id: string; properties?: Record<string, NotionProperty>; last_edited_time?: string }

const richText = (v: NotionProperty) => ((v as { title?: Array<{ plain_text?: string }>; rich_text?: Array<{ plain_text?: string }> } | undefined)?.title?.[0]?.plain_text ?? (v as { rich_text?: Array<{ plain_text?: string }> } | undefined)?.rich_text?.[0]?.plain_text ?? '')
const selectName = (v: NotionProperty) => (v as { select?: { name?: 'low' | 'medium' | 'high' } } | undefined)?.select?.name
const checkbox = (v: NotionProperty) => (v as { checkbox?: boolean } | undefined)?.checkbox
const numberVal = (v: NotionProperty) => (v as { number?: number } | undefined)?.number
const peopleName = (v: NotionProperty) => (v as { people?: Array<{ name?: string }> } | undefined)?.people?.[0]?.name
const filesUrl = (v: NotionProperty) => (v as { files?: Array<{ file?: { url?: string }; external?: { url?: string } }> } | undefined)?.files?.[0]?.file?.url ?? (v as { files?: Array<{ file?: { url?: string }; external?: { url?: string } }> } | undefined)?.files?.[0]?.external?.url
const multiSelect = (v: NotionProperty) => (v as { multi_select?: Array<{ name: string }> } | undefined)?.multi_select?.map((t) => t.name) ?? []

function prop(record: NotionRecord, ...keys: string[]) {
  for (const key of keys) {
    if (record?.properties?.[key]) return record.properties[key]
  }
  return undefined
}

export function mapPerson(record: NotionRecord): PersonEntity {
  return {
    id: record.id,
    name: richText(prop(record, 'Name')) || 'Unknown',
    role: selectName(prop(record, 'Role')),
    avatar: filesUrl(prop(record, 'Avatar')),
    active: checkbox(prop(record, 'Active')),
    unresolvedCount: numberVal(prop(record, 'Unresolved')) ?? 0,
    updatesCount: numberVal(prop(record, 'Updates')) ?? 0,
    pressure: selectName(prop(record, 'Pressure')),
    partner: checkbox(prop(record, 'Partner')),
  }
}

export function mapOperation(record: NotionRecord): OperationEntity {
  return {
    id: record.id,
    title: richText(prop(record, 'Name', 'Title')) || 'Operation',
    status: selectName(prop(record, 'Status')),
    unresolvedCount: numberVal(prop(record, 'Unresolved')) ?? 0,
    latestMovement: richText(prop(record, 'Latest Movement', 'Movement')),
    pressure: selectName(prop(record, 'Pressure')),
  }
}

export function mapContinuityEvent(record: NotionRecord, ownerById: Map<string, PersonEntity>): ContinuityEvent {
  const ownerId = (prop(record, 'Owner') as { relation?: Array<{ id: string }> } | undefined)?.relation?.[0]?.id
  const ownerName = peopleName(prop(record, 'Owner'))
  return {
    id: record.id,
    headline: richText(prop(record, 'Headline', 'Name')),
    body: richText(prop(record, 'Body', 'Summary')),
    timestamp: (prop(record, 'Timestamp') as { date?: { start?: string } } | undefined)?.date?.start ?? record.last_edited_time,
    image: filesUrl(prop(record, 'Image')),
    tags: multiSelect(prop(record, 'Tags')),
    owner: (ownerId ? ownerById.get(ownerId) : undefined) ?? (ownerName ? { id: ownerId ?? 'owner', name: ownerName } : undefined),
    pressure: selectName(prop(record, 'Pressure')),
    threadId: richText(prop(record, 'Thread')) || undefined,
  }
}

export function mapUnresolved(record: NotionRecord): UnresolvedObject {
  return {
    id: record.id,
    title: richText(prop(record, 'Title', 'Name')),
    severity: selectName(prop(record, 'Severity')),
    blocking: checkbox(prop(record, 'Blocking')),
    aging: numberVal(prop(record, 'Aging')) ?? 0,
    operation: richText(prop(record, 'Operation')),
  }
}

export function mapArtifact(record: NotionRecord): ArtifactEntity {
  return {
    id: record.id,
    title: richText(prop(record, 'Name', 'Title')),
    image: filesUrl(prop(record, 'Image', 'File')),
    eventId: (prop(record, 'Continuity Event') as { relation?: Array<{ id: string }> } | undefined)?.relation?.[0]?.id,
  }
}
