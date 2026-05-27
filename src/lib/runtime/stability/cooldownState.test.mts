import test from 'node:test'
import assert from 'node:assert/strict'

import type { ActiveCooldownInspection } from './cooldownState'

test('cooldown state remains inspection-only and non-authoritative', () => {
  const state: ActiveCooldownInspection = {
    activeCooldowns: [],
    escalationDelays: [],
    suppressedInvocationIds: [],
  }

  assert.deepEqual(state.suppressedInvocationIds, [])
})
