const SUPABASE_URL_KEYS = [
  'SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_PROJECT_URL',
] as const

const SUPABASE_ANON_KEYS = [
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_ANON_KEY',
  'SUPABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
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

function normalizeSupabaseUrl(value: string | undefined): string | undefined {
  if (!value) return value
  const trimmed = value.trim().replace(/\/+$/, '')
  return trimmed.replace(/\/(?:rest|auth|storage|functions)\/v1$/i, '')
}

export function resolveSupabaseUrl() {
  const resolved = resolveFirst(SUPABASE_URL_KEYS)
  return {
    key: resolved.key,
    value: normalizeSupabaseUrl(resolved.value),
  }
}

export function resolveSupabaseServiceRoleKey() {
  return resolveFirst(SUPABASE_SERVICE_ROLE_KEYS)
}

export function resolveSupabaseAnonKey() {
  return resolveFirst(SUPABASE_ANON_KEYS)
}

export function resolveSupabaseConfig(): { url: string; serviceRoleKey: string } {
  const url = resolveSupabaseUrl().value
  const serviceRoleKey = resolveSupabaseServiceRoleKey().value
  if (!url || !serviceRoleKey) {
    throw new Error('Missing Supabase configuration: expected SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY-compatible key')
  }
  return { url, serviceRoleKey }
}

export function resolveSupabaseBrowserConfig(): { url: string; anonKey: string } {
  const url = resolveSupabaseUrl().value
  const anonKey = resolveSupabaseAnonKey().value
  if (!url || !anonKey) {
    throw new Error('Missing Supabase browser configuration: expected SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY-compatible key')
  }
  return { url, anonKey }
}
