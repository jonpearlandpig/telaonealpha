'use client'

import { startTransition, useEffect, useState } from 'react'
import { ShowTelaShell } from './ShowTelaShell'
import type { ShowTelaViewModel } from './types'
import { clearStaleRuntimeSnapshot } from '@/lib/showtela/runtimePersist'
import { subscribeToContinuity } from '@/lib/supabase/realtime'

type User = { name: string; email: string; image: string }
type ShowTelaDataResponse = {
  vm: ShowTelaViewModel
}

const DIAGNOSTIC_LABELS: Record<string, string> = {
  'notion-unavailable': 'Last known state',
  'persistence-failed': 'Persistence offline',
  'persistence-stale': 'Syncing…',
}

const DIAGNOSTIC_COLORS: Record<string, string> = {
  'notion-unavailable': '#A89880',
  'persistence-failed': '#F87171',
  'persistence-stale': '#A89880',
}

function DiagnosticBar({ state }: { state: string }) {
  const label = DIAGNOSTIC_LABELS[state]
  const color = DIAGNOSTIC_COLORS[state] ?? '#A89880'
  if (!label) return null
  return (
    <div
      className="mx-5 mb-2 flex items-center gap-2 rounded-xl px-3 py-2"
      style={{ backgroundColor: `${color}18`, border: `1px solid ${color}30` }}
    >
      <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      <p className="text-[11px] font-medium tracking-wide" style={{ color }}>{label}</p>
    </div>
  )
}

function RuntimeDebugOverlay({ vm }: { vm: ShowTelaViewModel }) {
  const meta = vm.runtimeSnapshotMeta
  const isCanonical = Boolean(meta?.canonical)
  const snapshotId = meta?.snapshotId ? meta.snapshotId.slice(0, 16) + '…' : '—'
  const updatedAt = meta?.updatedAt ? new Date(meta.updatedAt).toLocaleTimeString() : '—'
  return (
    <div
      className="pointer-events-none fixed right-2 top-2 z-[9999] min-w-[200px] rounded-lg px-3 py-2 font-mono text-[10px] leading-5 text-white shadow-lg"
      style={{ background: 'rgba(0,0,0,0.82)' }}
    >
      <div>SOURCE: {vm.source ?? '—'}</div>
      <div>SNAPSHOT: {snapshotId}</div>
      <div>UPDATED: {updatedAt}</div>
      <div>CANONICAL: {isCanonical ? 'YES' : 'NO'}</div>
      <div>RENDER MODE: {meta?.overwriteMode ?? '—'}</div>
      <div>FEED: {vm.feed?.length ?? 0} OPS: {vm.crusadeOperations?.length ?? 0} PEOPLE: {vm.activeOps?.length ?? 0}</div>
    </div>
  )
}

function vmSignature(vm: ShowTelaViewModel) {
  return JSON.stringify({
    snapshotId: vm.runtimeSnapshotMeta?.snapshotId ?? null,
    updatedAt: vm.runtimeSnapshotMeta?.updatedAt ?? null,
    people: vm.activeOps.length,
    operations: vm.crusadeOperations.length,
    calendar: vm.calendarEvents?.length ?? 0,
    feed: vm.feed.length,
  })
}

export function ShowTelaRuntime({
  vm: initialVm,
  user,
  workspaceId,
}: {
  vm: ShowTelaViewModel
  user?: User
  workspaceId: string
}) {
  const [vm, setVm] = useState<ShowTelaViewModel>(initialVm)
  const [showDebug] = useState(() =>
    typeof window !== 'undefined' && (
      process.env.NEXT_PUBLIC_SHOWTELA_DEBUG_UI === 'true' ||
      new URLSearchParams(window.location.search).get('showtela_debug') === '1'
    )
  )

  async function hydrateFromServer(previousSignature?: string) {
    const maxAttempts = previousSignature ? 24 : 1

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const res = await fetch(`/api/showtela-data?workspaceId=${encodeURIComponent(workspaceId)}`, {
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`Hydration fetch failed with HTTP ${res.status}`)

      const data = await res.json() as ShowTelaDataResponse
      const nextVm = data.vm
      const nextSignature = vmSignature(nextVm)

      if (!previousSignature || nextSignature !== previousSignature) {
        startTransition(() => {
          setVm(nextVm)
        })
        return true
      }

      await new Promise(resolve => setTimeout(resolve, 250))
    }

    return false
  }

  // Clear any stale localStorage state left from pre-canonical-snapshot sessions — run once on mount
  useEffect(() => {
    clearStaleRuntimeSnapshot()
    // Log uses initialVm which is the stable SSR prop — safe in a mount-only effect
    const snap = initialVm.runtimeSnapshotMeta?.snapshotId ?? '—'
    console.log('[SHOWTELA] mount — source:', initialVm.source, 'snap:', snap, 'feed:', initialVm.feed?.length ?? 0, 'ops:', initialVm.crusadeOperations?.length ?? 0)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const unsubscribe = subscribeToContinuity(() => {
      void hydrateFromServer().catch((err) => {
        console.error('[SHOWTELA] continuity subscription hydrate failed:', err)
      })
    })
    return unsubscribe
  }, [workspaceId])

  const showDiagnostic = vm.diagnosticState && vm.diagnosticState !== 'persistence-connected'

  return (
    <>
      {showDebug && <RuntimeDebugOverlay vm={vm} />}
      <ShowTelaShell
        vm={vm}
        user={user}
        onHydrate={async () => hydrateFromServer(vmSignature(vm))}
      />
      {showDiagnostic && (
        <div className="pointer-events-none fixed bottom-28 left-0 right-0 z-40 mx-auto w-full max-w-[430px] px-5 md:max-w-[680px] xl:max-w-[760px]">
          <DiagnosticBar state={vm.diagnosticState!} />
        </div>
      )}
    </>
  )
}
