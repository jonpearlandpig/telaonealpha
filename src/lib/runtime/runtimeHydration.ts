import { loadWorkspaceHydrationState } from '@/lib/supabase/hydration'
import { loadDurableContinuity } from './durableMemory'
import { extractUnresolvedState } from './unresolvedContinuity'

export async function hydrateRuntime(workspaceId: string) {
  const [state, durable] = await Promise.all([
    loadWorkspaceHydrationState(workspaceId),
    loadDurableContinuity(workspaceId),
  ])
  const unresolved = extractUnresolvedState(durable.artifacts as never[])
  return {
    activeProjects: state.activeProjects,
    activeEntities: state.entities,
    latestLineage: state.lineage,
    pinnedContinuity: state.pinned,
    recentDecisions: state.recentDecisions,
    snapshots: durable.snapshots,
    unresolved,
  }
}
