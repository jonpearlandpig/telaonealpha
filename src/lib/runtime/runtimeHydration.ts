import { loadWorkspaceHydrationState } from '@/lib/supabase/hydration'
import { loadDurableContinuity } from './durableMemory'
import { extractUnresolvedState } from './unresolvedContinuity'

export async function hydrateRuntime(workspaceId: string) {
  console.log('[runtimeHydration] starting, workspace:', workspaceId)

  const [state, durable] = await Promise.all([
    loadWorkspaceHydrationState(workspaceId),
    loadDurableContinuity(workspaceId),
  ])

  let unresolved: ReturnType<typeof extractUnresolvedState>
  try {
    unresolved = extractUnresolvedState(durable.artifacts as never[])
  } catch (err) {
    console.error('[runtimeHydration] extractUnresolvedState failed:', String(err))
    unresolved = { unresolvedThreads: [], unansweredQuestions: [], stalledProjects: [], incompleteArtifacts: [], pendingLineageChains: [] }
  }

  console.log('[runtimeHydration] complete', {
    activeProjects: state.activeProjects.length,
    entities: state.entities.length,
    durableArtifacts: durable.artifacts.length,
  })

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
