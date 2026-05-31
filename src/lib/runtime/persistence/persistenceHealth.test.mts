import test from 'node:test'
import assert from 'node:assert/strict'

import { inspectPersistenceHealth } from './persistenceHealth'

function restoreEnv(key: 'NEXT_PUBLIC_SUPABASE_URL' | 'NEXT_PUBLIC_SUPABASE_ANON_KEY' | 'SUPABASE_SERVICE_ROLE_KEY', value: string | undefined) {
  if (value === undefined) {
    delete process.env[key]
    return
  }
  process.env[key] = value
}

test('persistence health reports healthy readiness when both constitutional tables are reachable', async () => {
  const originalEnv = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  }

  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'

  try {
    const output = await inspectPersistenceHealth({
      probeTable: async () => ({ available: true, status: 'ok' }),
    })

    assert.equal(output.persistenceHealthy, true)
    assert.equal(output.runtimeEventsAvailable, true)
    assert.equal(output.enforcementPersistenceAvailable, true)
    assert.equal(output.replayPersistenceReady, true)
    assert.equal(output.escalationPersistenceReady, true)
    assert.equal(output.degraded, false)
    assert.deepEqual(output.warnings, [])
  } finally {
    restoreEnv('NEXT_PUBLIC_SUPABASE_URL', originalEnv.NEXT_PUBLIC_SUPABASE_URL)
    restoreEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', originalEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    restoreEnv('SUPABASE_SERVICE_ROLE_KEY', originalEnv.SUPABASE_SERVICE_ROLE_KEY)
  }
})

test('persistence health exposes degraded truth when runtime_events or enforcement_actions are unavailable', async () => {
  const originalEnv = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  }

  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'

  try {
    const output = await inspectPersistenceHealth({
      probeTable: async (table) => ({
        available: false,
        status: 'error',
        warning: `${table} probe failed: Connection terminated due to connection timeout`,
      }),
    })

    assert.equal(output.persistenceHealthy, false)
    assert.equal(output.runtimeEventsAvailable, false)
    assert.equal(output.enforcementPersistenceAvailable, false)
    assert.equal(output.replayPersistenceReady, false)
    assert.equal(output.escalationPersistenceReady, false)
    assert.equal(output.degraded, true)
    assert.equal(output.warnings.some((warning) => warning.includes('runtime_events probe failed')), true)
  } finally {
    restoreEnv('NEXT_PUBLIC_SUPABASE_URL', originalEnv.NEXT_PUBLIC_SUPABASE_URL)
    restoreEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', originalEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    restoreEnv('SUPABASE_SERVICE_ROLE_KEY', originalEnv.SUPABASE_SERVICE_ROLE_KEY)
  }
})
