import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { resolveSupabaseBrowserConfig } from './env'

let _client: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (_client) return _client
  const { url, anonKey } = resolveSupabaseBrowserConfig()
  _client = createClient(url, anonKey, { auth: { persistSession: false } })
  return _client
}
