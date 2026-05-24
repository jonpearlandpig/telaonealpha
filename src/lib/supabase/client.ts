import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { resolveSupabaseConfig } from './env'

let _client: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (_client) return _client
  const { url, serviceRoleKey } = resolveSupabaseConfig()
  _client = createClient(url, serviceRoleKey, { auth: { persistSession: false } })
  return _client
}
