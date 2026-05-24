import { getSupabaseClient } from './client'
import { resolveSupabaseConfig } from './env'

export function getSupabaseServerClient() {
  return getSupabaseClient()
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
