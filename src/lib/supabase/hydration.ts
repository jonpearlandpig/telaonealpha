import { getSupabaseConfig, supabaseHeaders } from './server'

export type HydrationState = {
  activeProjects: string[]
  unresolved: string[]
  entities: string[]
  lineage: string[]
  pinned: string[]
  recentDecisions: string[]
}

const EMPTY_STATE: HydrationState = {
  activeProjects: [],
  unresolved: [],
  entities: [],
  lineage: [],
  pinned: [],
  recentDecisions: [],
}

// NOTE: hydrate_workspace_continuity RPC does not yet exist in Supabase.
// This function logs the attempt and returns empty state rather than throwing.
export async function loadWorkspaceHydrationState(workspaceId: string): Promise<HydrationState> {
  let cfg: { url: string; serviceRoleKey: string }
  try {
    cfg = getSupabaseConfig()
  } catch (err) {
    console.error('[supabase:hydration] config unavailable:', String(err))
    return EMPTY_STATE
  }

  const endpoint = `${cfg.url}/rest/v1/rpc/hydrate_workspace_continuity`
  console.log('[supabase:hydration] calling RPC', endpoint, 'workspace:', workspaceId)

  let res: Response
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: supabaseHeaders(cfg.serviceRoleKey),
      body: JSON.stringify({ workspace_id: workspaceId }),
      cache: 'no-store',
    })
  } catch (err) {
    console.error('[supabase:hydration] fetch threw (network error):', String(err))
    return EMPTY_STATE
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '(unreadable)')
    if (res.status === 404) {
      console.warn('[supabase:hydration] RPC hydrate_workspace_continuity does not exist yet (404) — returning empty state. Body:', body.slice(0, 200))
    } else {
      console.error(`[supabase:hydration] RPC failed HTTP ${res.status}:`, body.slice(0, 300))
    }
    return EMPTY_STATE
  }

  try {
    const data = await res.json() as Partial<HydrationState>
    console.log('[supabase:hydration] RPC ok, workspace:', workspaceId)
    return {
      activeProjects: data.activeProjects ?? [],
      unresolved: data.unresolved ?? [],
      entities: data.entities ?? [],
      lineage: data.lineage ?? [],
      pinned: data.pinned ?? [],
      recentDecisions: data.recentDecisions ?? [],
    }
  } catch (err) {
    console.error('[supabase:hydration] failed to parse RPC response:', String(err))
    return EMPTY_STATE
  }
}
