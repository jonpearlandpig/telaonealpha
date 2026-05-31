import 'server-only'

import { createClient } from '@supabase/supabase-js'
import { resolveSupabaseConfig } from './env'

export function getSupabaseServerClient() {
  const { url, serviceRoleKey } = resolveSupabaseConfig()
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } })
}

export function getSupabaseConfig(): { url: string; serviceRoleKey: string } {
  return resolveSupabaseConfig()
}

export function supabaseHeaders(serviceRoleKey: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  }
}
