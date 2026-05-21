import { getSupabaseServerClient } from './server'
import type { DurableArtifactRow, DurableEntityRow, DurableSnapshotRow } from './schema'

// DB uses snake_case columns; these helpers map to/from the camelCase TS types.

type ArtifactDbRow = {
  id: string
  workspace_id: string
  thread_id: string
  file_name?: string
  mime_type?: string
  lineage_id?: string
  artifact_group_id?: string
  payload?: string
  created_at: string
  updated_at: string
  provenance: DurableArtifactRow['provenance']
}

type EntityDbRow = {
  id: string
  workspace_id: string
  name: string
  type: string
  continuity_count: number
  unresolved_links: number
  related_artifacts: string[]
  related_threads: string[]
  temporal_clusters: string[]
  created_at: string
  updated_at: string
  provenance: DurableEntityRow['provenance']
}

type SnapshotDbRow = {
  id: string
  workspace_id: string
  thread_refs: string[]
  entity_refs: string[]
  lineage_refs: string[]
  unresolved_count: number
  created_at: string
  updated_at: string
  provenance: DurableSnapshotRow['provenance']
}

function toArtifactRow(db: ArtifactDbRow): DurableArtifactRow {
  return {
    id: db.id,
    workspaceId: db.workspace_id,
    threadId: db.thread_id,
    fileName: db.file_name,
    mimeType: db.mime_type,
    lineageId: db.lineage_id,
    artifactGroupId: db.artifact_group_id,
    payload: db.payload,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
    provenance: db.provenance,
  }
}

function toEntityRow(db: EntityDbRow): DurableEntityRow {
  return {
    id: db.id,
    workspaceId: db.workspace_id,
    name: db.name,
    type: db.type,
    continuityCount: db.continuity_count,
    unresolvedLinks: db.unresolved_links,
    relatedArtifacts: db.related_artifacts,
    relatedThreads: db.related_threads,
    temporalClusters: db.temporal_clusters,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
    provenance: db.provenance,
  }
}

function toSnapshotRow(db: SnapshotDbRow): DurableSnapshotRow {
  return {
    id: db.id,
    workspaceId: db.workspace_id,
    threadRefs: db.thread_refs,
    entityRefs: db.entity_refs,
    lineageRefs: db.lineage_refs,
    unresolvedCount: db.unresolved_count,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
    provenance: db.provenance,
  }
}

export async function upsertArtifactRow(row: DurableArtifactRow): Promise<DurableArtifactRow> {
  console.log('[supabase:queries:upsertArtifactRow] id:', row.id, 'workspace:', row.workspaceId)
  const db = getSupabaseServerClient()
  const { error } = await db.from('durable_artifacts').upsert({
    id: row.id,
    workspace_id: row.workspaceId,
    thread_id: row.threadId,
    file_name: row.fileName,
    mime_type: row.mimeType,
    lineage_id: row.lineageId,
    artifact_group_id: row.artifactGroupId,
    payload: row.payload,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    provenance: row.provenance,
  }, { onConflict: 'id' })
  if (error) {
    console.error('[supabase:queries:upsertArtifactRow] failed:', error.message, 'code:', error.code, 'id:', row.id)
    throw new Error(`upsertArtifactRow: ${error.message}`)
  }
  return row
}

export async function upsertEntityRow(row: DurableEntityRow): Promise<DurableEntityRow> {
  console.log('[supabase:queries:upsertEntityRow] id:', row.id, 'workspace:', row.workspaceId)
  const db = getSupabaseServerClient()
  const { error } = await db.from('durable_entities').upsert({
    id: row.id,
    workspace_id: row.workspaceId,
    name: row.name,
    type: row.type,
    continuity_count: row.continuityCount,
    unresolved_links: row.unresolvedLinks,
    related_artifacts: row.relatedArtifacts,
    related_threads: row.relatedThreads,
    temporal_clusters: row.temporalClusters,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    provenance: row.provenance,
  }, { onConflict: 'id' })
  if (error) {
    console.error('[supabase:queries:upsertEntityRow] failed:', error.message, 'code:', error.code, 'id:', row.id)
    throw new Error(`upsertEntityRow: ${error.message}`)
  }
  return row
}

export async function upsertSnapshotRow(row: DurableSnapshotRow): Promise<DurableSnapshotRow> {
  console.log('[supabase:queries:upsertSnapshotRow] id:', row.id, 'workspace:', row.workspaceId)
  const db = getSupabaseServerClient()
  const { error } = await db.from('durable_snapshots').upsert({
    id: row.id,
    workspace_id: row.workspaceId,
    thread_refs: row.threadRefs,
    entity_refs: row.entityRefs,
    lineage_refs: row.lineageRefs,
    unresolved_count: row.unresolvedCount,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    provenance: row.provenance,
  }, { onConflict: 'id' })
  if (error) {
    console.error('[supabase:queries:upsertSnapshotRow] failed:', error.message, 'code:', error.code, 'id:', row.id)
    throw new Error(`upsertSnapshotRow: ${error.message}`)
  }
  return row
}

export async function listWorkspaceArtifacts(workspaceId: string): Promise<DurableArtifactRow[]> {
  const db = getSupabaseServerClient()
  const { data, error } = await db
    .from('durable_artifacts')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`listWorkspaceArtifacts: ${error.message}`)
  return (data as ArtifactDbRow[]).map(toArtifactRow)
}

export async function listWorkspaceEntities(workspaceId: string): Promise<DurableEntityRow[]> {
  const db = getSupabaseServerClient()
  const { data, error } = await db
    .from('durable_entities')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false })
  if (error) throw new Error(`listWorkspaceEntities: ${error.message}`)
  return (data as EntityDbRow[]).map(toEntityRow)
}

export async function listWorkspaceSnapshots(workspaceId: string): Promise<DurableSnapshotRow[]> {
  const db = getSupabaseServerClient()
  const { data, error } = await db
    .from('durable_snapshots')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`listWorkspaceSnapshots: ${error.message}`)
  return (data as SnapshotDbRow[]).map(toSnapshotRow)
}
