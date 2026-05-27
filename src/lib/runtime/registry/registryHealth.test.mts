import test from 'node:test'
import assert from 'node:assert/strict'

import { buildRegistryHealthSummary, isModuleHealthy } from './registryHealth'

test('buildRegistryHealthSummary tracks module health observationally', () => {
  const summary = buildRegistryHealthSummary()

  assert.equal(summary.active.length, 7)
  assert.equal(summary.degraded.length, 0)
  assert.equal(summary.disabled.length, 0)
  assert.equal(summary.quarantined.length, 0)
  assert.equal(summary.deprecated.length, 0)
})

test('isModuleHealthy only treats active modules as healthy', () => {
  assert.equal(isModuleHealthy('active'), true)
  assert.equal(isModuleHealthy('degraded'), false)
  assert.equal(isModuleHealthy('quarantined'), false)
})
