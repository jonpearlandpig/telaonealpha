'use client'

import { useState, useEffect, useCallback } from 'react'
import { ShowTelaShell } from './ShowTelaShell'
import type { ShowTelaViewModel } from './types'

type User = { name: string; email: string; image: string }

const DIAGNOSTIC_LABELS: Record<string, string> = {
  'mock-data-active': 'Demo data — connect Notion to go live',
  'notion-unavailable': 'Last known state',
  'persistence-failed': 'Persistence offline',
  'persistence-stale': 'Syncing…',
}

const DIAGNOSTIC_COLORS: Record<string, string> = {
  'mock-data-active': '#F59E0B',
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

export function ShowTelaRuntime({ vm: initialVm, user }: { vm: ShowTelaViewModel; user?: User }) {
  const [vm, setVm] = useState(initialVm)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/home-feed', { cache: 'no-store' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        console.warn('[ShowTelaRuntime] refresh failed:', res.status, body)
        if (body.diagnosticState) {
          setVm(prev => ({ ...prev, diagnosticState: body.diagnosticState }))
        }
        return
      }
      const fresh: ShowTelaViewModel = await res.json()
      setVm(prev => ({
        ...prev,
        activeOps: fresh.activeOps?.length ? fresh.activeOps : prev.activeOps,
        fluencyPartners: fresh.fluencyPartners?.length ? fresh.fluencyPartners : prev.fluencyPartners,
        crusadeOperations: fresh.crusadeOperations?.length ? fresh.crusadeOperations : prev.crusadeOperations,
        unresolvedPressure: fresh.unresolvedPressure ?? prev.unresolvedPressure,
        unresolved: fresh.unresolved ?? prev.unresolved,
        feed: fresh.feed?.length ? fresh.feed : prev.feed,
        source: fresh.source,
        diagnosticState: fresh.diagnosticState,
      }))
    } catch (err) {
      console.warn('[ShowTelaRuntime] refresh network error:', err)
    }
  }, [])

  useEffect(() => {
    refresh()
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [refresh])

  const showDiagnostic = vm.diagnosticState && vm.diagnosticState !== 'persistence-connected'

  return (
    <>
      <ShowTelaShell vm={vm} onPearlDrop={() => {}} user={user} />
      {showDiagnostic && (
        <div className="pointer-events-none fixed bottom-28 left-0 right-0 z-40 mx-auto max-w-md px-5">
          <DiagnosticBar state={vm.diagnosticState!} />
        </div>
      )}
    </>
  )
}
