import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { listWorkspaceArtifacts, listWorkspaceEntities } from '@/lib/supabase/queries'
import type { DurableArtifactRow, DurableEntityRow } from '@/lib/supabase/schema'
import type { ArtifactRecord } from '@/lib/artifacts/artifactStore'
import type { EntityRecord, EntityType } from '@/lib/entities/entityEngine'
import { SHOWTELA_WORKSPACE_ID } from '@/lib/showtela/runtimeIds'

const VALID_ENTITY_TYPES = new Set<EntityType>(['person', 'project', 'organization', 'system', 'location', 'ip', 'context', 'venue'])

function toArtifactRecord(row: DurableArtifactRow): ArtifactRecord | null {
  // Primary path: payload stores full ArtifactRecord as JSON
  if (row.payload) {
    try {
      const parsed = JSON.parse(row.payload) as ArtifactRecord
      if (parsed && typeof parsed.id === 'string' && typeof parsed.threadId === 'string') {
        return parsed
      }
    } catch { /* fall through to reconstruction */ }
  }
  // Fallback: reconstruct from available columns (rows persisted before payload-as-JSON change)
  if (!row.fileName) return null
  const ext = row.fileName.split('.').pop()?.toLowerCase()
  return {
    id: row.id,
    title: row.fileName,
    threadId: row.threadId,
    sessionId: 'restored',
    fileName: row.fileName,
    mimeType: row.mimeType,
    lineageId: row.lineageId,
    artifactGroupId: row.artifactGroupId,
    ...(ext === 'html' ? { html: row.payload ?? '' } :
        ext === 'md'   ? { markdown: row.payload ?? '' } :
                         { text: row.payload ?? '' }),
    entities: [],
    projects: [],
    createdAt: row.createdAt,
    pinned: false,
    classification: 'runtime_artifact',
  }
}

function toEntityRecord(row: DurableEntityRow): EntityRecord {
  const type: EntityType = VALID_ENTITY_TYPES.has(row.type as EntityType)
    ? (row.type as EntityType)
    : 'context'
  return {
    id: row.id,
    name: row.name,
    type,
    aliases: [],
    firstSeen: row.createdAt,
    lastSeen: row.updatedAt,
    linkedArtifacts: [],
    linkedThreads: [],
    operationalContexts: [],
    continuityCount: row.continuityCount,
    unresolvedLinks: row.unresolvedLinks,
    relatedArtifacts: row.relatedArtifacts,
    relatedThreads: row.relatedThreads,
    temporalClusters: row.temporalClusters,
  }
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const [artifactRows, entityRows] = await Promise.all([
      listWorkspaceArtifacts(SHOWTELA_WORKSPACE_ID),
      listWorkspaceEntities(SHOWTELA_WORKSPACE_ID),
    ])
    const artifacts = artifactRows.map(toArtifactRecord).filter(Boolean) as ArtifactRecord[]
    const entities = entityRows.map(toEntityRecord)
    return NextResponse.json({ artifacts, entities, source: 'supabase' }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    console.error('[load-artifacts]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
