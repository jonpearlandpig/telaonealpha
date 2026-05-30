import test from 'node:test'
import assert from 'node:assert/strict'

import { buildRegistryMetadata } from './registryMetadata'

test('buildRegistryMetadata exposes deterministic registry observability only', () => {
  const metadata = buildRegistryMetadata()

  assert.equal(metadata.registryVersion, '5.2')
  assert.equal(metadata.schemaVersion, 'pigpen.registry.v1')
  assert.equal(metadata.operatorCount, 4)
  assert.equal(metadata.constitutionalSystemCount, 3)
  assert.equal(metadata.activeModuleCount, 7)
  assert.equal(metadata.degradedModuleCount, 0)
  assert.equal(metadata.quarantinedModuleCount, 0)
})
