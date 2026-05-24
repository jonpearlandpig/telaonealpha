import { parseMarkdownDirectory } from '@/lib/continuity/parseMarkdownDirectory'
import { loadDurableContinuity } from '@/lib/runtime/durableMemory'
import type { ArtifactRecord } from '@/lib/artifacts/artifactStore'
import type { DurableArtifactRow } from '@/lib/supabase/schema'
import { SHOWTELA_RUNTIME_ARTIFACT_GROUP_ID, SHOWTELA_WORKSPACE_ID } from './runtimeIds'
import { createRuntimeSnapshotMeta, isCanonicalRuntimeSnapshot } from './runtimeSnapshot'
import type { ContinuityEvent, OperationEntity, PersonEntity, ShowTelaHomeData } from './types'

function parseArtifactPayload(payload: string | undefined): ArtifactRecord | null {
  if (!payload) return null
  try {
    return JSON.parse(payload) as ArtifactRecord
  } catch {
    return null
  }
}

function recoverEventFromArtifact(artifact: ArtifactRecord): ContinuityEvent {
  const structure = artifact.structure
  if (structure) {
    try {
      const parsed = JSON.parse(structure) as {
        continuityEvent?: ContinuityEvent
      }
      if (parsed.continuityEvent) return parsed.continuityEvent
    } catch {
      // Fall back to artifact fields.
    }
  }

  return {
    id: artifact.id,
    headline: artifact.title,
    body: artifact.text,
    timestamp: artifact.createdAt,
    threadId: artifact.threadId,
  }
}

function reconstructDirectoryState(artifact: ArtifactRecord): { people: PersonEntity[]; operations: OperationEntity[] } | null {
  const parsed = parseMarkdownDirectory(artifact.text ?? '')
  if (!parsed.people.length && !parsed.departments.length) return null

  const people = parsed.people.map((person) => ({
    id: `dir-${person.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name: person.name,
    role: person.role || person.department || undefined,
    avatar: '',
    active: true,
    partner: false,
    unresolvedCount: 0,
  }))

  const operations = parsed.departments.map((department) => ({
    id: `dept-${department.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    title: department,
    status: 'active',
    unresolvedCount: 0,
    latestMovement: 'Recovered from durable continuity artifact',
  }))

  return { people, operations }
}

function inferArtifactOperationState(artifact: ArtifactRecord): { people: PersonEntity[]; operations: OperationEntity[] } | null {
  const candidates = [
    artifact.title,
    artifact.fileName,
    artifact.text?.split('\n').map((line) => line.trim()).find(Boolean),
  ].filter(Boolean) as string[]

  for (const raw of candidates) {
    const cleaned = raw
      .replace(/^#+\s*/, '')
      .replace(/\.[^.]+$/, '')
      .replace(/\b(call sheet|schedule|production schedule|daily schedule|show schedule)\b/gi, '')
      .replace(/[-_:|]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (cleaned.length >= 3) {
      return {
        people: [],
        operations: [{
          id: `artifact-${cleaned.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
          title: cleaned,
          status: 'active',
          unresolvedCount: 0,
          latestMovement: 'Recovered from durable ingest artifact',
        }],
      }
    }
  }

  return null
}

export function recoverCanonicalShowTelaHomeFromArtifactRows(input: {
  artifacts: DurableArtifactRow[]
  cached: ShowTelaHomeData | null
  cachedUpdatedAt?: string | null
}): ShowTelaHomeData | null {
  if (isCanonicalRuntimeSnapshot(input.cached) && input.cached?.runtimeSnapshotMeta?.overwriteMode === 'replace') {
    return input.cached ?? null
  }

  const runtimeArtifacts = input.artifacts
    .map((row) => parseArtifactPayload(row.payload))
    .filter((artifact): artifact is ArtifactRecord => Boolean(artifact))
    .filter((artifact) => artifact.artifactGroupId === SHOWTELA_RUNTIME_ARTIFACT_GROUP_ID)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())

  const cachedTime = input.cached?.runtimeSnapshotMeta?.updatedAt ?? input.cachedUpdatedAt ?? null

  for (const artifact of runtimeArtifacts) {
    const rebuilt = reconstructDirectoryState(artifact) ?? inferArtifactOperationState(artifact)
    if (!rebuilt) continue

    if (cachedTime && new Date(artifact.createdAt).getTime() <= new Date(cachedTime).getTime()) {
      continue
    }

    const event = recoverEventFromArtifact(artifact)
    return {
      activeOps: rebuilt.people.slice(0, 20),
      fluencyPartners: [],
      operations: rebuilt.operations,
      unresolved: [],
      continuityFeed: [event],
      pressureSummary: { total: 0, high: 0, medium: 0 },
      runtimeTimeline: [{
        id: `timeline-${event.id}`,
        timestamp: event.timestamp ?? artifact.createdAt,
        actor: event.owner?.name ?? 'Operations',
        summary: event.headline,
        continuityObjectId: event.continuityObject?.id ?? event.threadId ?? event.id,
        pressureDelta: 0,
      }],
      source: 'supabase',
      diagnosticState: 'persistence-connected',
      runtimeSnapshotMeta: createRuntimeSnapshotMeta({
        snapshotId: `recovered-${artifact.id}`,
        workspaceId: SHOWTELA_WORKSPACE_ID,
        updatedAt: artifact.createdAt,
        overwriteMode: 'replace',
        sourceIngest: rebuilt.people.length > 0 ? 'directory' : 'artifact',
      }),
    }
  }

  return null
}

export async function recoverCanonicalShowTelaHomeFromDurable(input: {
  cached: ShowTelaHomeData | null
  cachedUpdatedAt?: string | null
}): Promise<ShowTelaHomeData | null> {
  const durable = await loadDurableContinuity(SHOWTELA_WORKSPACE_ID)
  return recoverCanonicalShowTelaHomeFromArtifactRows({
    artifacts: durable.artifacts,
    cached: input.cached,
    cachedUpdatedAt: input.cachedUpdatedAt,
  })
}
