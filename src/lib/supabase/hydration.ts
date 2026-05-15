import { getSupabaseConfig, supabaseHeaders } from './server'

export type HydrationState = {
  activeProjects: string[]
  unresolved: string[]
  entities: string[]
  lineage: string[]
  pinned: string[]
  recentDecisions: string[]
}

export async function loadWorkspaceHydrationState(workspaceId: string): Promise<HydrationState> {
  const cfg = getSupabaseConfig()
  const res = await fetch(`${cfg.url}/rest/v1/rpc/hydrate_workspace_continuity`, {
    method: 'POST',
    headers: supabaseHeaders(cfg.serviceRoleKey),
    body: JSON.stringify({ workspace_id: workspaceId }),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`hydration failed ${res.status}`)
  const data = await res.json() as Partial<HydrationState>
  return {
    activeProjects: data.activeProjects ?? [],
    unresolved: data.unresolved ?? [],
    entities: data.entities ?? [],
    lineage: data.lineage ?? [],
    pinned: data.pinned ?? [],
    recentDecisions: data.recentDecisions ?? [],
  }
}
