import test from 'node:test'
import assert from 'node:assert/strict'
import { countVmRuntimeContent, resolveVmAuthority, shouldAcceptVmAuthorityUpdate } from './runtimeAuthority'
import type { ShowTelaViewModel } from '@/components/showtela/types'
import type { ShowTelaRuntimeSnapshotMeta } from './types'

function meta(updatedAt: string, overwriteMode: 'merge' | 'replace' = 'replace'): ShowTelaRuntimeSnapshotMeta {
  return {
    snapshotId: `snap-${updatedAt}`,
    workspaceId: 'tela-showtela',
    updatedAt,
    canonical: true,
    overwriteMode,
    sourceIngest: 'directory',
  }
}

function vm(input?: Partial<ShowTelaViewModel>): ShowTelaViewModel {
  return {
    activeOps: [],
    fluencyPartners: [],
    crusadeOperations: [],
    unresolvedPressure: {
      unresolvedCount: 0,
      overdueCount: 0,
      blockedCount: 0,
      pendingApprovals: 0,
    },
    unresolved: [],
    feed: [],
    continuityObjects: [],
    runtimeTimeline: [],
    source: 'supabase',
    diagnosticState: 'persistence-connected',
    ...input,
  }
}

test('countVmRuntimeContent counts hydrated home data across view-model arrays', () => {
  assert.equal(countVmRuntimeContent(vm({
    activeOps: [{ id: 'a', name: 'Positive Rocks Lead', image: '' }],
    crusadeOperations: [{ id: 'o', name: 'Positive Rocks', label: 'Positive Rocks', image: '' }],
    feed: [{ id: 'f', timestamp: '', title: 'Positive Rocks directory ingested', summary: '', owner: '', image: '', avatar: '', unresolved: false, linkedEntities: [] }],
  })), 3)
})

test('canonical replace authority rejects non-canonical incoming refresh payloads', () => {
  const current = vm({
    activeOps: [{ id: 'a', name: 'Positive Rocks Lead', image: '' }],
    runtimeSnapshotMeta: meta('2026-05-24T12:00:00.000Z'),
  })
  const incoming = vm({
    activeOps: [],
    source: 'empty',
  })

  assert.equal(shouldAcceptVmAuthorityUpdate(current, incoming), false)
})

test('canonical replace authority also recognizes snapshotType replace marker', () => {
  const current = vm({
    activeOps: [{ id: 'a', name: 'Positive Rocks Lead', image: '' }],
    runtimeSnapshotMeta: {
      snapshotId: 'snap-current',
      workspaceId: 'tela-showtela',
      updatedAt: '2026-05-24T12:00:00.000Z',
      canonical: true,
      overwriteMode: 'merge',
      snapshotType: 'replace',
      sourceIngest: 'directory',
    },
  })
  const incoming = vm({ source: 'empty' })

  assert.equal(shouldAcceptVmAuthorityUpdate(current, incoming), false)
})

test('canonical replace authority accepts newer canonical replace payloads', () => {
  const current = vm({
    activeOps: [{ id: 'a', name: 'Positive Rocks Lead', image: '' }],
    runtimeSnapshotMeta: meta('2026-05-24T12:00:00.000Z'),
  })
  const incoming = vm({
    activeOps: [{ id: 'b', name: 'Newer Lead', image: '' }],
    runtimeSnapshotMeta: meta('2026-05-24T13:00:00.000Z'),
  })

  assert.equal(shouldAcceptVmAuthorityUpdate(current, incoming), true)
})

test('hydrated runtime rejects empty refresh downgrades even without canonical meta', () => {
  const current = vm({
    activeOps: [{ id: 'a', name: 'Positive Rocks Lead', image: '' }],
    feed: [{ id: 'f', timestamp: '', title: 'Positive Rocks directory ingested', summary: '', owner: '', image: '', avatar: '', unresolved: false, linkedEntities: [] }],
  })
  const incoming = vm({
    source: 'empty',
    diagnosticState: 'notion-unavailable',
  })

  assert.equal(shouldAcceptVmAuthorityUpdate(current, incoming), false)
})

test('resolveVmAuthority keeps current hydrated runtime when incoming authority is weaker', () => {
  const current = vm({
    activeOps: [{ id: 'a', name: 'Positive Rocks Lead', image: '' }],
    feed: [{ id: 'f', timestamp: '', title: 'Positive Rocks directory ingested', summary: '', owner: '', image: '', avatar: '', unresolved: false, linkedEntities: [] }],
    runtimeSnapshotMeta: meta('2026-05-24T12:00:00.000Z'),
  })
  const incoming = vm({
    source: 'empty',
    diagnosticState: 'notion-unavailable',
  })

  assert.equal(resolveVmAuthority(current, incoming), current)
})
