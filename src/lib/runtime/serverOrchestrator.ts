import { loadDurableContinuity, persistDurableContinuity } from './durableMemory'
import { retrieveOperationalContext } from './akbRetrieval'
import { getCached, setCached } from './retrievalCache'

export async function orchestrateServerContinuity(workspaceId: string, query: string, threadId: string) {
  const cacheKey = `${workspaceId}:${threadId}:${query}`
  const cached = getCached<ReturnType<typeof retrieveOperationalContext>>(cacheKey)
  if (cached) return cached
  const durable = await loadDurableContinuity(workspaceId)
  const result = retrieveOperationalContext({ query, threadId, artifacts: durable.artifacts as never[], entities: durable.entities as never[] })
  setCached(cacheKey, result, 30_000)
  return result
}

export async function hydrateServerDurableMemory(workspaceId: string, payload: Parameters<typeof persistDurableContinuity>[1]) {
  await persistDurableContinuity(workspaceId, payload)
}
