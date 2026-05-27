import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getOperationalOntologyDefinition,
  OPERATIONAL_ONTOLOGY_REGISTRY,
  OPERATIONAL_ONTOLOGY_VERSION,
} from './operationalOntology'

test('operational ontology registry is static and complete', () => {
  assert.equal(OPERATIONAL_ONTOLOGY_VERSION, 'operational-ontology.v1')
  assert.deepEqual(Object.keys(OPERATIONAL_ONTOLOGY_REGISTRY).sort(), [
    'approval',
    'artifact',
    'communication',
    'continuity-thread',
    'decision',
    'escalation',
    'logistics-item',
    'operational-task',
    'person',
    'schedule-item',
    'unresolved-item',
    'venue',
  ])

  const thread = getOperationalOntologyDefinition('continuity-thread')
  assert.equal(thread.canonicalType, 'continuity-thread')
  assert.equal(thread.reconciliationStrategy, 'canonical-id-lineage-and-sequence')
  assert.deepEqual(thread.identityRequirements, ['canonical-object-id', 'thread-id'])
})
