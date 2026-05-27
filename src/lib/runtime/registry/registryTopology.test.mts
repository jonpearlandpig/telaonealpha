import test from 'node:test'
import assert from 'node:assert/strict'

import { getModulesForAction, inspectRuntimeTopology } from './registryTopology'

test('inspectRuntimeTopology exposes deterministic runtime topology and constitutional separation', () => {
  const topology = inspectRuntimeTopology()

  assert.equal(topology.registryVersion, '5.2')
  assert.equal(topology.modules.length, 7)
  assert.deepEqual(topology.constitutionalSystems.map((module) => module.id), ['telauthorium', 'pen-and-sword', 'the-ledger'])
  assert.equal(topology.authorityMappings['flightpath-engine'], 'S1')
  assert.deepEqual(topology.escalationTargetsByModule['garvis-enforcement'], ['runtime-governance-lead', 'sovereign-authority'])
})

test('getModulesForAction returns legal modules without replay contamination', () => {
  const modules = getModulesForAction('generate.report')

  assert.deepEqual(modules.map((module) => module.id), ['garvis-enforcement'])
  assert.equal('lastReplaySequence' in modules[0], false)
})
