import { getSupabaseClient } from './client'

export function getSupabaseServerClient() {
  return getSupabaseClient()
}

export function getSupabaseConfig(): { url: string; serviceRoleKey: string } {
  const url = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
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
