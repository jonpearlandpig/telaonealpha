import { getSupabaseClient } from './client'
import { assertServerEnv } from '@/lib/runtime/env'

export function getSupabaseServerClient() {
  return getSupabaseClient()
}

export function getSupabaseConfig(): { url: string; serviceRoleKey: string } {
  const env = assertServerEnv()
  const url = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!env.ok || !url || !serviceRoleKey) {
    throw new Error(`Missing required env: ${env.requiredMissing.join(', ') || 'unknown'}`)
  }
  return { url, serviceRoleKey }
}

export function supabaseHeaders(serviceRoleKey: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  }
}
