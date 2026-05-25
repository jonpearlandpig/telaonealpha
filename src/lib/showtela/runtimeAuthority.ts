import type { ShowTelaRuntimeSnapshotMeta } from './types'
import type { ShowTelaViewModel } from '@/components/showtela/types'

function toEpoch(value: string | undefined): number {
  if (!value) return 0
  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}

export function countVmRuntimeContent(vm: Pick<ShowTelaViewModel, 'activeOps' | 'fluencyPartners' | 'crusadeOperations' | 'unresolved' | 'feed'>): number {
  return (
    (vm.activeOps?.length ?? 0) +
    (vm.fluencyPartners?.length ?? 0) +
    (vm.crusadeOperations?.length ?? 0) +
    (vm.unresolved?.length ?? 0) +
    (vm.feed?.length ?? 0)
  )
}

export function hasVmRuntimeContent(vm: Pick<ShowTelaViewModel, 'activeOps' | 'fluencyPartners' | 'crusadeOperations' | 'unresolved' | 'feed'>): boolean {
  return countVmRuntimeContent(vm) > 0
}

export function isCanonicalReplaceMeta(meta: ShowTelaRuntimeSnapshotMeta | undefined): boolean {
  return Boolean(meta?.canonical && (meta?.snapshotType === 'replace' || meta?.overwriteMode === 'replace'))
}

export function shouldAcceptVmAuthorityUpdate(current: ShowTelaViewModel, incoming: ShowTelaViewModel): boolean {
  const currentMeta = current.runtimeSnapshotMeta
  const incomingMeta = incoming.runtimeSnapshotMeta

  if (isCanonicalReplaceMeta(currentMeta)) {
    if (!isCanonicalReplaceMeta(incomingMeta)) return false
    return toEpoch(incomingMeta?.updatedAt) >= toEpoch(currentMeta?.updatedAt)
  }

  if (hasVmRuntimeContent(current) && !hasVmRuntimeContent(incoming)) {
    return false
  }

  return true
}

export function resolveVmAuthority(current: ShowTelaViewModel, incoming: ShowTelaViewModel): ShowTelaViewModel {
  return shouldAcceptVmAuthorityUpdate(current, incoming) ? incoming : current
}
