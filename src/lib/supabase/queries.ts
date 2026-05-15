import { getSupabaseServerClient } from './server'
import type { DurableArtifactRow, DurableEntityRow, DurableSnapshotRow } from './schema'

export function upsertArtifactRow(row: DurableArtifactRow): DurableArtifactRow {
  const db = getSupabaseServerClient().store
  const idx = db.artifacts.findIndex((a) => a.id === row.id && a.workspaceId === row.workspaceId)
  if (idx >= 0) db.artifacts[idx] = row
  else db.artifacts.unshift(row)
  return row
}

export function upsertEntityRow(row: DurableEntityRow): DurableEntityRow {
  const db = getSupabaseServerClient().store
  const idx = db.entities.findIndex((e) => e.id === row.id && e.workspaceId === row.workspaceId)
  if (idx >= 0) db.entities[idx] = row
  else db.entities.unshift(row)
  return row
}

export function upsertSnapshotRow(row: DurableSnapshotRow): DurableSnapshotRow {
  const db = getSupabaseServerClient().store
  const idx = db.snapshots.findIndex((s) => s.id === row.id && s.workspaceId === row.workspaceId)
  if (idx >= 0) db.snapshots[idx] = row
  else db.snapshots.unshift(row)
  return row
}

export function listWorkspaceArtifacts(workspaceId: string): DurableArtifactRow[] {
  return getSupabaseServerClient().store.artifacts.filter((a) => a.workspaceId === workspaceId)
}
export function listWorkspaceEntities(workspaceId: string): DurableEntityRow[] {
  return getSupabaseServerClient().store.entities.filter((e) => e.workspaceId === workspaceId)
}
export function listWorkspaceSnapshots(workspaceId: string): DurableSnapshotRow[] {
  return getSupabaseServerClient().store.snapshots.filter((s) => s.workspaceId === workspaceId)
}
