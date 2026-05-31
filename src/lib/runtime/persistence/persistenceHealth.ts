import {
  resolveSupabaseAnonKey,
  resolveSupabaseServiceRoleKey,
  resolveSupabaseUrl,
} from '@/lib/supabase/env'

export type PersistenceProbeStatus = 'ok' | 'missing_env' | 'error'

export type PersistenceTableProbe = {
  available: boolean
  status: PersistenceProbeStatus
  warning?: string
}

export type PersistenceHealth = {
  persistenceHealthy: boolean
  runtimeEventsAvailable: boolean
  enforcementPersistenceAvailable: boolean
  replayPersistenceReady: boolean
  escalationPersistenceReady: boolean
  connectivity: {
    supabaseUrlConfigured: boolean
    supabaseAnonKeyConfigured: boolean
    supabaseServiceRoleConfigured: boolean
    connected: boolean
    status: PersistenceProbeStatus
  }
  degraded: boolean
  warnings: string[]
}

function missingEnvWarnings() {
  const warnings: string[] = []
  if (!resolveSupabaseUrl().value) warnings.push('Missing Supabase URL configuration.')
  if (!resolveSupabaseAnonKey().value) warnings.push('Missing Supabase anon/publishable key configuration.')
  if (!resolveSupabaseServiceRoleKey().value) warnings.push('Missing Supabase service role key configuration.')
  return warnings
}

function connectionWarning(table: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return `${table} probe failed: ${message}`
}

async function probeTableAvailability(table: string): Promise<PersistenceTableProbe> {
  const missingWarnings = missingEnvWarnings()
  if (missingWarnings.length > 0) {
    return {
      available: false,
      status: 'missing_env',
      warning: missingWarnings.join(' '),
    }
  }

  try {
    const { getSupabaseServerClient } = await import('@/lib/supabase/server')
    const db = getSupabaseServerClient()
    const { error } = await db.from(table).select('id').limit(1)
    if (error) {
      return {
        available: false,
        status: 'error',
        warning: connectionWarning(table, error.message),
      }
    }

    return {
      available: true,
      status: 'ok',
    }
  } catch (error) {
    return {
      available: false,
      status: 'error',
      warning: connectionWarning(table, error),
    }
  }
}

export async function inspectPersistenceHealth(options?: {
  probeTable?: (table: string) => Promise<PersistenceTableProbe>
}) : Promise<PersistenceHealth> {
  const warnings = missingEnvWarnings()
  const probeTable = options?.probeTable ?? probeTableAvailability

  const [runtimeEvents, enforcementActions] = await Promise.all([
    probeTable('runtime_events'),
    probeTable('enforcement_actions'),
  ])

  if (runtimeEvents.warning && !warnings.includes(runtimeEvents.warning)) warnings.push(runtimeEvents.warning)
  if (enforcementActions.warning && !warnings.includes(enforcementActions.warning)) warnings.push(enforcementActions.warning)

  const connectivityConfigured = Boolean(resolveSupabaseUrl().value && resolveSupabaseServiceRoleKey().value)
  const connected = runtimeEvents.available || enforcementActions.available
  const connectivityStatus: PersistenceProbeStatus = connectivityConfigured
    ? (connected ? 'ok' : 'error')
    : 'missing_env'

  const replayPersistenceReady = runtimeEvents.available
  const escalationPersistenceReady = runtimeEvents.available && enforcementActions.available
  const persistenceHealthy = replayPersistenceReady && escalationPersistenceReady && warnings.length === 0

  return {
    persistenceHealthy,
    runtimeEventsAvailable: runtimeEvents.available,
    enforcementPersistenceAvailable: enforcementActions.available,
    replayPersistenceReady,
    escalationPersistenceReady,
    connectivity: {
      supabaseUrlConfigured: Boolean(resolveSupabaseUrl().value),
      supabaseAnonKeyConfigured: Boolean(resolveSupabaseAnonKey().value),
      supabaseServiceRoleConfigured: Boolean(resolveSupabaseServiceRoleKey().value),
      connected,
      status: connectivityStatus,
    },
    degraded: !persistenceHealthy,
    warnings,
  }
}
