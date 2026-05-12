'use client'

import { useState, useCallback, useEffect } from 'react'
import { TopNav } from '@/components/TopNav'
import { ContinuityPanel } from '@/components/ContinuityPanel'
import { ChatInterface } from '@/components/ChatInterface'
import { HHOPanel } from '@/components/HHOPanel'
import { HHO_LIST } from '@/lib/constants'
import type { SyncPayload } from '@/lib/notion'

type View = 'continuity' | 'chat' | 'hho'

type PearlItem = {
  id: string
  content: string
  source: string
  createdAt: string
}

function StatusBar({
  lastSynced,
  wikiLoaded,
}: {
  lastSynced?: string
  wikiLoaded: boolean
}) {
  const activeCount = HHO_LIST.filter((h) => h.status === 'active').length

  return (
    <div style={{
      height: 44,
      borderTop: '1px solid rgba(234,224,210,0.06)',
      background: '#0a1520',
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      gap: 24,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: lastSynced ? '#22c55e' : 'rgba(234,224,210,0.2)',
          display: 'inline-block',
        }} />
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'rgba(234,224,210,0.3)' }}>
          {lastSynced
            ? `Synced ${formatSyncLabel(lastSynced)}`
            : 'Not synced'}
        </span>
      </div>

      <span style={{ color: 'rgba(234,224,210,0.1)' }}>·</span>

      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'rgba(234,224,210,0.3)' }}>
        HHO {activeCount} active / {HHO_LIST.length} total
      </span>

      <span style={{ color: 'rgba(234,224,210,0.1)' }}>·</span>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {['Notion', 'Anthropic', 'Stack'].map((svc) => (
          <span key={svc} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: svc === 'Anthropic' && !wikiLoaded ? '#C4973A' : '#22c55e',
              display: 'inline-block',
            }} />
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'rgba(234,224,210,0.25)' }}>
              {svc}
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}

function formatSyncLabel(iso: string): string {
  const d = new Date(iso)
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const day = days[d.getDay()]
  const hrs = d.getHours()
  const min = d.getMinutes().toString().padStart(2, '0')
  const ampm = hrs >= 12 ? 'P' : 'A'
  const h = hrs % 12 || 12
  const mo = d.getMonth() + 1
  const dt = d.getDate()
  const yr = String(d.getFullYear()).slice(2)
  return `${day} ${h}:${min}${ampm} ${mo}/${dt}/${yr}`
}

export default function Home() {
  const [view, setView] = useState<View>('continuity')
  const [syncData, setSyncData] = useState<SyncPayload | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [pearlItems, setPearlItems] = useState<PearlItem[]>([])
  const [pearlLoading, setPearlLoading] = useState(false)

  const doSync = useCallback(async () => {
    if (syncing) return
    setSyncing(true)
    try {
      const res = await fetch('/api/sync')
      if (res.ok) {
        const data = await res.json()
        setSyncData(data)
      }
    } catch {
      // Sync failed silently — status bar will show unsynced
    } finally {
      setSyncing(false)
    }
  }, [syncing])

  const loadPearl = useCallback(async () => {
    setPearlLoading(true)
    try {
      const res = await fetch('/api/pearl-box')
      if (res.ok) {
        const data = await res.json()
        setPearlItems(data.items || [])
      }
    } catch {
      // silent
    } finally {
      setPearlLoading(false)
    }
  }, [])

  const capturePearl = useCallback(async (content: string) => {
    try {
      await fetch('/api/pearl-box', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, source: 'TELA' }),
      })
      await loadPearl()
    } catch {
      // silent
    }
  }, [loadPearl])

  useEffect(() => {
    doSync()
    loadPearl()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#0D1B2A' }}>
      <TopNav
        lastSynced={syncData?.lastSynced}
        onSync={doSync}
        syncing={syncing}
        activeView={view}
        onViewChange={setView}
      />

      <main style={{ flex: 1 }}>
        {view === 'continuity' && (
          <ContinuityPanel
            data={syncData}
            pearlItems={pearlItems}
            onCapturePearl={capturePearl}
            onRefreshPearl={loadPearl}
            pearlLoading={pearlLoading}
            syncing={syncing}
          />
        )}
        {view === 'chat' && (
          <ChatInterface wikiContext={syncData?.rawContext || ''} />
        )}
        {view === 'hho' && (
          <div style={{ overflowY: 'auto', height: 'calc(100vh - 56px - 44px)' }}>
            <HHOPanel />
          </div>
        )}
      </main>

      <StatusBar
        lastSynced={syncData?.lastSynced}
        wikiLoaded={!!syncData?.rawContext}
      />
    </div>
  )
}
