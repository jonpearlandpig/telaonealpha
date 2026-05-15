const CACHE = new Map<string, { value: unknown; expiresAt: number }>()

export function getCached<T>(key: string): T | null {
  const entry = CACHE.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) { CACHE.delete(key); return null }
  return entry.value as T
}

export function setCached<T>(key: string, value: T, ttlMs = 60_000): void {
  CACHE.set(key, { value, expiresAt: Date.now() + ttlMs })
}

export function invalidateCache(prefix: string): void {
  for (const key of CACHE.keys()) if (key.startsWith(prefix)) CACHE.delete(key)
}
