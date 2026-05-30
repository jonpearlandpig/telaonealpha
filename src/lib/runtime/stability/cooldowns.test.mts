import test from 'node:test'
import assert from 'node:assert/strict'

import { buildCooldown, deriveCooldownsFromEvents, isCooldownActive } from './cooldowns'
import type { RuntimeEvent } from '../runtimeTypes'

function event(input: Partial<RuntimeEvent> & Pick<RuntimeEvent, 'id' | 'type' | 'createdAt' | 'replaySequence'>): RuntimeEvent {
  return {
    workspaceId: 'tela-showtela',
    eventVersion: 1,
    schemaVersion: 'runtime.v1',
    source: 'operator',
    governanceState: 'approved',
    executionState: 'completed',
    payload: {},
    ...input,
  }
}

test('deterministic cooldown behavior remains stable', () => {
  const cooldown = buildCooldown({
    kind: 'invocation',
    subjectId: 'lineage-1',
    startedAt: '2026-05-27T00:00:00.000Z',
    suppressionReason: 'test',
  })

  assert.equal(cooldown.cooldownId, buildCooldown({
    kind: 'invocation',
    subjectId: 'lineage-1',
    startedAt: '2026-05-27T00:00:00.000Z',
    suppressionReason: 'test',
  }).cooldownId)
  assert.equal(isCooldownActive(cooldown, '2026-05-27T00:00:30.000Z'), true)
})

test('constitutional cooldown records remain observational and exempt', () => {
  const cooldowns = deriveCooldownsFromEvents([
    event({
      id: 'evt-1',
      replaySequence: 1,
      type: 'constitutional.invoked',
      createdAt: '2026-05-27T00:00:00.000Z',
      source: 'system',
    }),
  ])

  assert.equal(cooldowns[0]?.constitutionalExempt, true)
})
