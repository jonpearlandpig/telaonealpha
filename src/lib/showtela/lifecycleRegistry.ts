export const SHOWTELA_CREATED_EVENT_TYPE = 'showtela.lifecycle.created'
export const SHOWTELA_ARCHIVED_EVENT_TYPE = 'showtela.lifecycle.archived'

export type ShowTelaCreatedEventRow = {
  id: string
  workspace_id: string
  created_at: string
  payload: {
    showTelaName?: string
  } | null
}

export type ShowTelaArchivedEventRow = {
  workspace_id: string
  created_at: string
  payload: {
    showTelaId?: string
    showTelaName?: string
  } | null
}

export type ShowTelaActivityRow = {
  workspace_id: string
  created_at: string
}

export type ActiveShowTela = {
  showTelaId: string
  showTelaName: string
  workspaceId: string
  createdAt: string
  lastActivityAt: string
  archivedAt?: string
  status: 'active' | 'archived'
}

export type ArchivedShowTela = ActiveShowTela & {
  archivedAt: string
  status: 'archived'
}

export type ShowTelaRegistry = {
  active: ActiveShowTela[]
  archived: ArchivedShowTela[]
}

export function buildShowTelaRegistry(
  createdRows: ShowTelaCreatedEventRow[],
  activityRows: ShowTelaActivityRow[],
  archivedRows: ShowTelaArchivedEventRow[],
  normalizeShowTelaName: (input: string) => string,
): ShowTelaRegistry {
  const lastActivityByWorkspace = new Map<string, string>()
  const archivedAtByWorkspace = new Map<string, string>()

  for (const row of activityRows) {
    const existing = lastActivityByWorkspace.get(row.workspace_id)
    if (!existing || existing < row.created_at) {
      lastActivityByWorkspace.set(row.workspace_id, row.created_at)
    }
  }

  for (const row of archivedRows) {
    const existing = archivedAtByWorkspace.get(row.workspace_id)
    if (!existing || existing < row.created_at) {
      archivedAtByWorkspace.set(row.workspace_id, row.created_at)
    }
  }

  const registry = createdRows
    .map((row): ActiveShowTela | null => {
      const showTelaName = normalizeShowTelaName(String(row.payload?.showTelaName ?? ''))
      if (!showTelaName) return null
      const archivedAt = archivedAtByWorkspace.get(row.workspace_id)

      return {
        showTelaId: row.id,
        showTelaName,
        workspaceId: row.workspace_id,
        createdAt: row.created_at,
        lastActivityAt: lastActivityByWorkspace.get(row.workspace_id) ?? row.created_at,
        archivedAt,
        status: archivedAt ? 'archived' as const : 'active' as const,
      }
    })
    .filter((row): row is ActiveShowTela => Boolean(row))
    .sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt))

  return {
    active: registry.filter((row) => row.status === 'active'),
    archived: registry
      .filter((row): row is ArchivedShowTela => row.status === 'archived' && Boolean(row.archivedAt))
      .sort((a, b) => b.archivedAt.localeCompare(a.archivedAt)),
  }
}

export function buildActiveShowTelaRegistry(
  createdRows: ShowTelaCreatedEventRow[],
  activityRows: ShowTelaActivityRow[],
  normalizeShowTelaName: (input: string) => string,
): ActiveShowTela[] {
  return buildShowTelaRegistry(createdRows, activityRows, [], normalizeShowTelaName).active
}
