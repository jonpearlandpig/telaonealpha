import test from 'node:test'
import assert from 'node:assert/strict'

import canonicalRegistry from '../../../../public/data/pigpen-v5.2.json'
import { validateRegistryDocument } from './registryValidation'

test('validateRegistryDocument accepts canonical deterministic registry topology', () => {
  const result = validateRegistryDocument(canonicalRegistry)
  assert.equal(result.ok, true)
  assert.deepEqual(result.issues, [])
})

test('validateRegistryDocument rejects duplicate modules and constitutional ambiguity', () => {
  const malformed = {
    ...canonicalRegistry,
    modules: [
      ...canonicalRegistry.modules,
      {
        ...canonicalRegistry.modules[0],
        runtimeClass: 'operator',
      },
    ],
  }

  const result = validateRegistryDocument(malformed)
  assert.equal(result.ok, false)
  assert.equal(result.issues.some((issue) => issue.code === 'module.duplicate-id'), true)
  assert.equal(result.issues.some((issue) => issue.code === 'module.constitutional.operator-ambiguity' || issue.code === 'registry.constitutional.separation'), true)
})

test('validateRegistryDocument rejects malformed authority levels and invalid status states', () => {
  const malformed = {
    ...canonicalRegistry,
    modules: canonicalRegistry.modules.map((module, index) => index === 3
      ? { ...module, authorityLevel: 'S9', moduleStatus: 'floating' }
      : module),
  }

  const result = validateRegistryDocument(malformed)
  assert.equal(result.ok, false)
  assert.equal(result.issues.some((issue) => issue.code === 'module.authority.invalid'), true)
  assert.equal(result.issues.some((issue) => issue.code === 'module.status.invalid'), true)
})
