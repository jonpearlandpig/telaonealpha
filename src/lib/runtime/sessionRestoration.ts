import { hydrateRuntime } from './runtimeHydration'
import { runHybridRetrieval } from '@/lib/retrieval/hybridRetrieval'

export async function restoreSessionOperationalContext(params: { workspaceId: string; threadId: string; query: string }) {
  const hydrated = await hydrateRuntime(params.workspaceId)
  const retrieved = await runHybridRetrieval({
    workspaceId: params.workspaceId,
    threadId: params.threadId,
    query: params.query,
    entityRefs: hydrated.activeEntities,
    unresolvedBias: hydrated.unresolved.unresolvedThreads.length * 4,
  })
  return { hydrated, retrieved }
}
