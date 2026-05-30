import test from 'node:test'
import assert from 'node:assert/strict'

import { constitutionalExecutesBeforeOperators, getConstitutionalExecutionOrder } from './constitutionalOrdering'

test('constitutional execution order is deterministic and fixed', () => {
  assert.deepEqual(getConstitutionalExecutionOrder(), ['telauthorium', 'pen-and-sword', 'the-ledger'])
})

test('constitutional lifecycle must complete before operator lifecycle begins', () => {
  assert.equal(constitutionalExecutesBeforeOperators([
    'constitutional.invoked',
    'constitutional.validated',
    'constitutional.audit.logged',
    'constitutional.legitimacy.confirmed',
    'operator.invoked',
  ]), true)
  assert.equal(constitutionalExecutesBeforeOperators([
    'constitutional.invoked',
    'operator.invoked',
    'constitutional.audit.logged',
  ]), false)
})
