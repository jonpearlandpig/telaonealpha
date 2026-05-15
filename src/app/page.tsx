'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

type PearlItem = {
  id: string
  content: string
  source: string
  createdAt: string
}

type MemoryRailItem = {
  id: string
  label: string
  helper: string
  unresolved?: number
  active?: boolean
  kind: 'pearl' | 'entity'
}

type FeedCard = {
  id: string
  entity: string
  status: string
  continuitySummary: string
  unresolvedCount: number
  participants: string[]
  metadata: string
  timestamp: string
}

const MEMORY_RAIL: MemoryRailItem[] = [
  { id: 'pearl-drop', label: 'YOU / PEARL DROP', helper: 'Capture continuity instantly', kind: 'pearl', active: true },
  { id: 'crusade', label: 'Crusade', helper: 'Routing pressure surfaced', unresolved: 3, kind: 'entity' },
  { id: 'rodney', label: 'Rodney Jerkins', helper: 'Session lineage attached', unresolved: 1, kind: 'entity' },
  { id: 'tourtext', label: 'TourText', helper: 'Launch continuity active', unresolved: 2, kind: 'entity' },
  { id: 'pearl-box', label: 'Pearl Box', helper: 'Recent drops indexed', kind: 'entity' },
  { id: 'runtime', label: 'TELA Runtime', helper: 'State stable / sync clean', kind: 'entity' },
]

const FEED_CARDS: FeedCard[] = [
  {
    id: '1',
    entity: 'Crusade Routing',
    status: 'Unresolved handoff pressure',
    continuitySummary: 'Backline reroute remains unconfirmed before call time; route decision is still open.',
    unresolvedCount: 2,
    participants: ['JH', 'RC', 'TM'],
    metadata: 'Thread · Venue Ops · Artifact lineage linked',
    timestamp: '12m ago',
  },
  {
    id: '2',
    entity: 'Rodney Session Timeline',
    status: 'Continuity intact',
    continuitySummary: 'Session choices are anchored and one approval path is waiting for final sign-off.',
    unresolvedCount: 1,
    participants: ['RJ', 'JH', 'PC'],
    metadata: 'Entity · Session Memory · Provenance verified',
    timestamp: '35m ago',
  },
  {
    id: '3',
    entity: 'TourText Launch',
    status: 'Active execution window',
    continuitySummary: 'Voice drops are connected to launch brief with next actions and accountable owners.',
    unresolvedCount: 3,
    participants: ['TL', 'MK', 'JH'],
    metadata: 'Program · Runtime Thread · Freshness high',
    timestamp: '1h ago',
  },
]

export default function Home() {
  const [pearlItems, setPearlItems] = useState<PearlItem[]>([])
  const [pearlLoading, setPearlLoading] = useState(false)
  const [pearlText, setPearlText] = useState('')
  const [syncing, setSyncing] = useState(false)

  const loadPearl = useCallback(async () => {
    setPearlLoading(true)
    try {
      const res = await fetch('/api/pearl-box')
      if (res.ok) {
        const data = await res.json()
        setPearlItems(data.items || [])
      }
    } catch {
      // quiet by design
    } finally {
      setPearlLoading(false)
    }
  }, [])

  const doSync = useCallback(async () => {
    if (syncing) return
    setSyncing(true)
    try {
      await fetch('/api/sync')
    } catch {
      // quiet by design
    } finally {
      setSyncing(false)
    }
  }, [syncing])

  const capturePearl = useCallback(async () => {
    const content = pearlText.trim()
    if (!content) return

    try {
      await fetch('/api/pearl-box', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, source: 'PEARL_DROP' }),
      })
      setPearlText('')
      await loadPearl()
    } catch {
      // quiet by design
    }
  }, [loadPearl, pearlText])

  useEffect(() => {
    const timer = setTimeout(() => {
      void doSync()
      void loadPearl()
    }, 0)

    return () => clearTimeout(timer)
  }, [doSync, loadPearl])

  const latestPearls = useMemo(() => pearlItems.slice(0, 2), [pearlItems])

  return (
    <div className="min-h-screen bg-[#EAE0D2] text-[#0D1B2A] antialiased">
      <div className="mx-auto flex min-h-screen w-full max-w-[393px] flex-col bg-[#EAE0D2] pb-24">
        <header className="sticky top-0 z-20 border-b border-[#0D1B2A]/10 bg-[#EAE0D2]/95 px-6 pb-5 pt-[max(20px,env(safe-area-inset-top))] backdrop-blur-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1.5">
              <p className="text-[32px] font-semibold leading-[0.95] tracking-[-0.03em]">TELAOne</p>
              <p className="text-[10px] uppercase tracking-[0.24em] text-[#0D1B2A]/58">Operational Continuity Runtime</p>
            </div>
            <div className="flex items-center gap-2">
              {[
                { label: 'Search', icon: '⌕' },
                { label: 'Notifications', icon: '◉' },
                { label: 'Runtime Sync', icon: syncing ? '↻' : '◎' },
              ].map((action) => (
                <button
                  key={action.label}
                  aria-label={action.label}
                  onClick={action.label === 'Runtime Sync' ? doSync : undefined}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-[#0D1B2A]/15 bg-[#F7F0E3] text-lg shadow-[0_1px_3px_rgba(13,27,42,0.07)]"
                >
                  {action.icon}
                </button>
              ))}
            </div>
          </div>
        </header>

        <main className="space-y-8 px-6 pt-7">
          <section className="space-y-4" aria-label="Operational Memory Rail">
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#0D1B2A]/63">Operational Memory Rail</h2>
              <button onClick={loadPearl} className="min-h-11 px-1 text-xs font-medium text-[#0D1B2A]/60">Refresh</button>
            </div>
            <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {MEMORY_RAIL.map((item) => (
                <article key={item.id} className="min-w-[106px] snap-start text-center">
                  <div className="relative mx-auto mb-3.5 flex h-[84px] w-[84px] items-center justify-center rounded-full bg-[#F8F1E4] shadow-[0_6px_16px_rgba(13,27,42,0.08)]">
                    <div className={`h-[74px] w-[74px] rounded-full border-2 ${item.kind === 'pearl' ? 'border-[#C4973A] bg-[#F5E6C2]' : 'border-[#0D1B2A]/16 bg-[#EDE1D2]'}`} />
                    {item.active ? <span className="absolute right-1.5 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-[#F8F1E4] bg-[#C4973A]" /> : null}
                    {item.unresolved ? <span className="absolute -right-1 top-2 rounded-full border border-[#C4973A]/80 bg-[#F8E8C6] px-1.5 py-0.5 text-[10px] font-semibold">{item.unresolved}</span> : null}
                  </div>
                  <p className="text-[12.5px] font-semibold leading-tight">{item.label}</p>
                  <p className="mt-1 text-[11px] leading-snug text-[#0D1B2A]/62">{item.helper}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-[#C4973A]/45 bg-[#FBF6EA] p-5 shadow-[0_8px_22px_rgba(13,27,42,0.08)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#0D1B2A]/70">Pearl Drop</p>
            <p className="mt-2 text-[15px] leading-relaxed text-[#0D1B2A]/74">Drop context before it disappears.</p>
            <textarea
              value={pearlText}
              onChange={(e) => setPearlText(e.target.value)}
              placeholder="Capture continuity instantly…"
              className="mt-4 min-h-[124px] w-full rounded-2xl border border-[#0D1B2A]/14 bg-[#FFFDF8] px-4 py-3.5 text-[15px] leading-relaxed outline-none ring-[#C4973A] placeholder:text-[#0D1B2A]/36 focus:ring-2"
            />
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-[11px] text-[#0D1B2A]/58">{pearlLoading ? 'Refreshing continuity…' : `${pearlItems.length} drops in runtime memory`}</p>
              <button onClick={capturePearl} className="min-h-11 rounded-full bg-[#0D1B2A] px-5 py-2.5 text-sm font-semibold text-[#EAE0D2] shadow-[0_6px_14px_rgba(13,27,42,0.18)]">Drop Pearl</button>
            </div>
            {latestPearls.length > 0 && (
              <div className="mt-4 space-y-2.5">
                {latestPearls.map((item) => (
                  <p key={item.id} className="rounded-xl border border-[#0D1B2A]/10 bg-[#FFFDF8] px-3.5 py-2.5 text-xs leading-relaxed text-[#0D1B2A]/78">{item.content}</p>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4" aria-label="Continuity Feed">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#0D1B2A]/63">Continuity Feed</h2>
            {FEED_CARDS.map((card) => (
              <article key={card.id} className="rounded-[26px] border border-[#0D1B2A]/12 bg-[#FAF4E8] p-5 shadow-[0_8px_18px_rgba(13,27,42,0.07)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5">
                    <div className="h-[58px] w-[58px] shrink-0 rounded-2xl border border-[#0D1B2A]/12 bg-[#E7DACA]" />
                    <div>
                      <p className="text-[18px] font-semibold leading-tight tracking-[-0.015em]">{card.entity}</p>
                      <p className="mt-1.5 text-[13px] leading-snug text-[#0D1B2A]/70">{card.status}</p>
                    </div>
                  </div>
                  <span className="rounded-full border border-[#C4973A]/75 bg-[#F8E8C7] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide">{card.unresolvedCount} unresolved</span>
                </div>
                <p className="mt-4 text-[14.5px] leading-relaxed text-[#0D1B2A]/83">{card.continuitySummary}</p>
                <div className="mt-4 flex items-center justify-between text-[11px] text-[#0D1B2A]/60">
                  <p>{card.metadata}</p>
                  <p>{card.timestamp}</p>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex -space-x-2.5">
                    {card.participants.map((participant) => (
                      <span key={participant} className="flex h-8 w-8 items-center justify-center rounded-full border border-[#EAE0D2] bg-[#0D1B2A] text-[10px] font-semibold text-[#EAE0D2]">{participant}</span>
                    ))}
                  </div>
                  <button className="min-h-11 rounded-full border border-[#0D1B2A]/22 bg-[#FDF9F0] px-4.5 text-sm font-medium">Open Thread</button>
                </div>
              </article>
            ))}
          </section>
        </main>

        <nav className="fixed bottom-0 left-1/2 z-30 flex w-full max-w-[393px] -translate-x-1/2 border-t border-[#0D1B2A]/10 bg-[#EAE0D2]/98 px-4 pb-[max(10px,env(safe-area-inset-bottom))] pt-2.5 backdrop-blur-sm">
          {[
            { label: 'Home', icon: '⌂' },
            { label: 'Search', icon: '⌕' },
            { label: 'Create', icon: '+' },
            { label: 'Voice', icon: '◌' },
            { label: 'Profile', icon: '◍' },
          ].map((item) => (
            <button
              key={item.label}
              aria-label={item.label}
              className={`flex min-h-11 flex-1 items-center justify-center rounded-xl text-[20px] ${item.label === 'Create' ? 'bg-[#0D1B2A] text-[#EAE0D2] shadow-[0_6px_12px_rgba(13,27,42,0.18)]' : 'text-[#0D1B2A]/90'}`}
            >
              {item.icon}
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}
