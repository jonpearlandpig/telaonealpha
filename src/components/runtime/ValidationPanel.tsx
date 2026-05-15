'use client'
import { useMemo } from 'react'
import type { ContinuitySnapshot } from '@/lib/runtime/continuitySnapshots'
import type { OperationalState } from '@/lib/runtime/operationalState'
import type { AttentionItem } from '@/lib/runtime/attentionEngine'
import type { ValidationLog } from '@/lib/runtime/validationLogs'

type Props = {
  hydrationStatus: string
  restorationSource: string
  snapshot: ContinuitySnapshot | null
  state: OperationalState
  attention: AttentionItem[]
  logs: ValidationLog[]
  momentumScore: number
}

export function ValidationPanel({ hydrationStatus, restorationSource, snapshot, state, attention, logs, momentumScore }: Props) {
  const top = useMemo(() => attention.slice(0, 3), [attention])
  return <div className="tela-card" style={{ padding: '12px 14px', marginTop: 14 }}>
    <div style={{ fontSize: 11, color: 'rgba(234,224,210,0.45)', marginBottom: 8 }}>Runtime Validation</div>
    <div style={{ fontSize: 12, color: '#EAE0D2', lineHeight: 1.6 }}>
      <div>Hydration: {hydrationStatus}</div>
      <div>Restoration: {restorationSource}</div>
      <div>Snapshot: {snapshot?.id ?? 'none'}</div>
      <div>Unresolved: {state.unresolvedContinuity.length}</div>
      <div>Threads: {state.activeThreads.length}</div>
      <div>Entities: {state.activeEntities.length}</div>
      <div>Momentum: {momentumScore.toFixed(1)}</div>
      <div>Stale resurfacing: {state.staleImportantMemory.length}</div>
    </div>
    <div style={{ marginTop: 8, fontSize: 11, color: '#C4973A' }}>
      {top.map((a) => `${a.whyNow}`).join(' • ') || 'No attention items'}
    </div>
    <div style={{ marginTop: 8, fontSize: 10, color: 'rgba(234,224,210,0.55)' }}>
      Retrieval traces: {logs.length}
    </div>
  </div>
}
