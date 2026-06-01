import test from 'node:test'
import assert from 'node:assert/strict'
import { buildActiveShowTelaRegistry, buildShowTelaRegistry } from './lifecycleRegistry'

test('buildActiveShowTelaRegistry maps created rows and latest activity', () => {
  const registry = buildActiveShowTelaRegistry(
    [
      {
        id: 'show-1',
        workspace_id: 'showtela-crusade-1',
        created_at: '2026-05-30T10:00:00.000Z',
        payload: { showTelaName: 'Crusade 2027' },
      },
      {
        id: 'show-2',
        workspace_id: 'showtela-festival-1',
        created_at: '2026-05-31T08:00:00.000Z',
        payload: { showTelaName: 'Festival Run' },
      },
    ],
    [
      { workspace_id: 'showtela-crusade-1', created_at: '2026-05-31T11:00:00.000Z' },
      { workspace_id: 'showtela-crusade-1', created_at: '2026-05-30T10:00:00.000Z' },
      { workspace_id: 'showtela-festival-1', created_at: '2026-05-31T08:00:00.000Z' },
    ],
    (value) => value.trim().replace(/\s+/g, ' '),
  )

  assert.equal(registry.length, 2)
  assert.equal(registry[0]?.showTelaName, 'Crusade 2027')
  assert.equal(registry[0]?.lastActivityAt, '2026-05-31T11:00:00.000Z')
  assert.equal(registry[1]?.showTelaId, 'show-2')
  assert.equal(registry[1]?.lastActivityAt, '2026-05-31T08:00:00.000Z')
})

test('buildShowTelaRegistry partitions archived ShowTELAs without deletion', () => {
  const registry = buildShowTelaRegistry(
    [
      {
        id: 'show-1',
        workspace_id: 'showtela-crusade-1',
        created_at: '2026-05-30T10:00:00.000Z',
        payload: { showTelaName: 'Crusade 2027' },
      },
      {
        id: 'show-2',
        workspace_id: 'showtela-festival-1',
        created_at: '2026-05-31T08:00:00.000Z',
        payload: { showTelaName: 'Festival Run' },
      },
    ],
    [
      { workspace_id: 'showtela-crusade-1', created_at: '2026-05-31T11:00:00.000Z' },
      { workspace_id: 'showtela-festival-1', created_at: '2026-05-31T09:00:00.000Z' },
    ],
    [
      {
        workspace_id: 'showtela-festival-1',
        created_at: '2026-05-31T09:30:00.000Z',
        payload: { showTelaId: 'show-2', showTelaName: 'Festival Run' },
      },
    ],
    (value) => value.trim().replace(/\s+/g, ' '),
  )

  assert.equal(registry.active.length, 1)
  assert.equal(registry.archived.length, 1)
  assert.equal(registry.active[0]?.showTelaId, 'show-1')
  assert.equal(registry.archived[0]?.showTelaId, 'show-2')
  assert.equal(registry.archived[0]?.archivedAt, '2026-05-31T09:30:00.000Z')
})
