'use client'

import { useState, useCallback, useEffect } from 'react'
import { BottomNav } from '@/components/BottomNav'
import ContinueScreen from '@/components/screens/ContinueScreen'
import BrowseScreen from '@/components/screens/BrowseScreen'
import VoiceScreen from '@/components/screens/VoiceScreen'
import TodayScreen from '@/components/screens/TodayScreen'
import MoreScreen from '@/components/screens/MoreScreen'
import type { SyncPayload } from '@/lib/notion'

type Tab = 'continue' | 'browse' | 'voice' | 'today' | 'more'

type PearlItem = {
  id: string
  content: string
  source: string
  createdAt: string
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('continue')
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
      // silent
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
    await fetch('/api/pearl-box', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, source: 'Thought' }),
    })
    await loadPearl()
  }, [loadPearl])

  useEffect(() => {
    doSync()
    loadPearl()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: 'var(--bg-void)',
        overflow: 'hidden',
      }}
    >
      {/* Screen content */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {activeTab === 'continue' && (
          <ContinueScreen syncData={syncData} syncing={syncing} />
        )}
        {activeTab === 'browse' && (
          <BrowseScreen syncData={syncData} />
        )}
        {activeTab === 'voice' && (
          <VoiceScreen />
        )}
        {activeTab === 'today' && (
          <TodayScreen syncData={syncData} syncing={syncing} />
        )}
        {activeTab === 'more' && (
          <MoreScreen
            lastSynced={syncData?.lastSynced}
            syncing={syncing}
            onSync={doSync}
            pearlItems={pearlItems}
            pearlLoading={pearlLoading}
            onCapturePearl={capturePearl}
            onRefreshPearl={loadPearl}
          />
        )}
      </div>

      {/* Bottom nav */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}
