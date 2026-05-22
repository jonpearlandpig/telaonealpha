import type { ShowTelaViewModel } from '@/components/showtela/types'

const KEY = 'showtela-runtime-v1'
const MAX_AGE_MS = 12 * 60 * 60 * 1000 // 12h

type Snapshot = { vm: ShowTelaViewModel; savedAt: number }

export function readRuntimeSnapshot(): ShowTelaViewModel | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const { vm, savedAt } = JSON.parse(raw) as Snapshot
    if (Date.now() - savedAt > MAX_AGE_MS) return null
    if (!vm.feed?.length) return null
    return vm
  } catch {
    return null
  }
}

export function writeRuntimeSnapshot(vm: ShowTelaViewModel): void {
  try {
    if (!vm.feed?.length) return
    localStorage.setItem(KEY, JSON.stringify({ vm, savedAt: Date.now() }))
  } catch {
    // localStorage unavailable — silent
  }
}
