'use client'

import { useState, useEffect, useCallback } from 'react'
import { ShowTelaShell } from './ShowTelaShell'
import type { ShowTelaViewModel } from './types'

type User = { name: string; email: string; image: string }

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

function HydrationDiagnostics({ vm }: { vm: ShowTelaViewModel }) {
  const h = vm.hydration
  if (!h) return null
  const last = h.lastHydratedAt ? new Date(h.lastHydratedAt).toLocaleString() : 'Not run'

  return (
    <div className="mx-5 mb-3 rounded-[16px] border border-[#E5D8BF] bg-[#FFFDF8] px-3 py-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8B6F32]">Hydration</p>
        <p className="text-[10px] font-medium text-[#8B847B]">{h.cacheSource}</p>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-[#5E5348]">
        <p>Connected to Notion: <span className="font-semibold text-[#141210]">{h.connectedToNotion ? 'yes' : 'no'}</span></p>
        <p>Connected to Supabase: <span className="font-semibold text-[#141210]">{h.connectedToSupabase ? 'yes' : 'no'}</span></p>
        <p>People rows: <span className="font-semibold text-[#141210]">{h.counts.people}</span></p>
        <p>Operations rows: <span className="font-semibold text-[#141210]">{h.counts.operations}</span></p>
        <p>Continuity rows: <span className="font-semibold text-[#141210]">{h.counts.continuity}</span></p>
        <p>Last hydration: <span className="font-semibold text-[#141210]">{last}</span></p>
      </div>
    </div>
  )
}

export function ShowTelaRuntime({ vm: initialVm, user }: { vm: ShowTelaViewModel; user?: User }) {
  const [vm, setVm] = useState(initialVm)
  const [showHydrationDebug] = useState(() =>
    typeof window !== 'undefined' && (
      process.env.NEXT_PUBLIC_SHOWTELA_DEBUG_UI === 'true' ||
      new URLSearchParams(window.location.search).get('showtela_debug') === '1'
    )
  )

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
      console.log('[SHOWTELA:setVm]', {
        source: fresh?.source,
        feedCount: fresh?.feed?.length,
        operationsCount: fresh?.crusadeOperations?.length,
        timestamp: Date.now()
      })
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
        hydration: fresh.hydration ?? prev.hydration,
      }))
    } catch (err) {
      console.warn('[ShowTelaRuntime] refresh network error:', err)
    }
  }, [])

  useEffect(() => {
    const refreshTimer = window.setTimeout(() => {
      void refresh()
    }, 0)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.clearTimeout(refreshTimer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [refresh])

  const showDiagnostic = vm.diagnosticState && vm.diagnosticState !== 'persistence-connected'

  return (
    <>
      {showHydrationDebug && <HydrationDiagnostics vm={vm} />}
      <ShowTelaShell vm={vm} onPearlDrop={() => {}} user={user} />
      {showDiagnostic && (
        <div className="pointer-events-none fixed bottom-28 left-0 right-0 z-40 mx-auto max-w-md px-5">
          <DiagnosticBar state={vm.diagnosticState!} />
        </div>
      )}
    </>
  )
}
