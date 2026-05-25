import type { ShowTelaViewModel } from '@/components/showtela/types'

// Canonical truth is Supabase snapshot only — localStorage restore is disabled
// to prevent stale runtime state from flashing before canonical hydration.
const STALE_KEY = 'showtela-runtime-v1'

export function clearStaleRuntimeSnapshot(): void {
  try {
    localStorage.removeItem(STALE_KEY)
  } catch {
    // localStorage unavailable — silent
  }
}

export function readRuntimeSnapshot(): ShowTelaViewModel | null {
  return null
}

export function writeRuntimeSnapshot(): void {
  // no-op — canonical truth lives in Supabase, not localStorage
}
