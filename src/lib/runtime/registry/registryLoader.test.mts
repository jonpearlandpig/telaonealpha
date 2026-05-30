import test from 'node:test'
import assert from 'node:assert/strict'

import { getActiveModules, getAuthorityMappings, getConstitutionalSystems, getDegradedModules, loadCanonicalRegistry, loadLineageCompatibilityRegistry } from './registryLoader'

test('loadCanonicalRegistry is deterministic and separate from lineage compatibility reference', () => {
  const first = loadCanonicalRegistry()
  const second = loadCanonicalRegistry()
  const lineage = loadLineageCompatibilityRegistry()

  assert.equal(first, second)
  assert.equal(first.registryVersion, '5.2')
  assert.equal(lineage.registryVersion, '5.1')
  assert.notEqual(first.registryVersion, lineage.registryVersion)
})

test('registry loader exposes constitutional separation and authority mappings', () => {
  const constitutionalSystems = getConstitutionalSystems()
  const authorityMappings = getAuthorityMappings()

  assert.deepEqual(constitutionalSystems.map((module) => module.id), ['telauthorium', 'pen-and-sword', 'the-ledger'])
  assert.equal(authorityMappings['garvis-enforcement'], 'S2')
  assert.equal(authorityMappings['telauthorium'], 'S4')
})

test('registry loader exposes active and degraded modules without replay fields', () => {
  const activeModules = getActiveModules()
  const degradedModules = getDegradedModules()

  assert.equal(activeModules.some((module) => module.id === 'continuity-operator'), true)
  assert.deepEqual(degradedModules.map((module) => module.id), [])
  assert.equal('replaySequence' in activeModules[0], false)
})
