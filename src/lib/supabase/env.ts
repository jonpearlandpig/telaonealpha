const SUPABASE_URL_KEYS = [
  'SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_PROJECT_URL',
] as const

const SUPABASE_SERVICE_ROLE_KEYS = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_SERVICE_KEY',
  'SUPABASE_SECRET_KEY',
  'SUPABASE_SERVICE_ROLE',
] as const

function resolveFirst(keys: readonly string[]) {
  for (const key of keys) {
    const value = process.env[key]
    if (value) return { key, value }
  }
  return { key: keys[0] ?? 'UNKNOWN', value: undefined }
}

export function resolveSupabaseUrl() {
  return resolveFirst(SUPABASE_URL_KEYS)
}

export function resolveSupabaseServiceRoleKey() {
  return resolveFirst(SUPABASE_SERVICE_ROLE_KEYS)
}

export function resolveSupabaseConfig(): { url: string; serviceRoleKey: string } {
  const url = resolveSupabaseUrl().value
  const serviceRoleKey = resolveSupabaseServiceRoleKey().value
  if (!url || !serviceRoleKey) {
    throw new Error('Missing Supabase configuration: expected SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY-compatible key')
  }
  return { url, serviceRoleKey }
}
