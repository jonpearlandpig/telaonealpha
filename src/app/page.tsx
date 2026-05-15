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
  tone: 'gold' | 'navy'
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
  { id: 'pearl-drop', label: 'You / Pearl Drop', helper: 'Capture continuity instantly', tone: 'gold' },
  { id: 'crusade', label: 'Crusade', helper: '3 unresolved threads', tone: 'navy' },
  { id: 'rodney', label: 'Rodney Jerkins', helper: 'Routing thread active', tone: 'navy' },
  { id: 'tourtext', label: 'TourText', helper: 'Lineage updated', tone: 'navy' },
  { id: 'pearl-box', label: 'Pearl Box', helper: 'Memory depth indexed', tone: 'navy' },
  { id: 'runtime', label: 'TELA Runtime', helper: 'Operational state stable', tone: 'navy' },
]

const FEED_CARDS: FeedCard[] = [
  {
    id: '1',
    entity: 'Crusade Routing',
    status: 'Unresolved handoff pressure',
    continuitySummary: 'Backline reroute still pending confirmation before call time.',
    unresolvedCount: 2,
    participants: ['JH', 'RC', 'TM'],
    metadata: 'Thread · Venue Ops · Artifact lineage linked',
    timestamp: '12m ago',
  },
  {
    id: '2',
    entity: 'Rodney Session Timeline',
    status: 'Continuity intact',
    continuitySummary: 'Session decisions anchored; one approval path remains open.',
    unresolvedCount: 1,
    participants: ['RJ', 'JH', 'PC'],
    metadata: 'Entity · Session Memory · Provenance verified',
    timestamp: '35m ago',
  },
  {
    id: '3',
    entity: 'TourText Launch',
    status: 'Active execution window',
    continuitySummary: 'Voice notes connected to launch brief with clear next action routing.',
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
      // deliberate quiet runtime surface
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
      // deliberate quiet runtime surface
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
      // deliberate quiet runtime surface
    }
  }, [loadPearl, pearlText])

  useEffect(() => {
    void doSync()
    void loadPearl()
  }, [doSync, loadPearl])

  const latestPearls = useMemo(() => pearlItems.slice(0, 2), [pearlItems])

  return (
    <div className="min-h-screen bg-[#EAE0D2] text-[#0D1B2A]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col border-x border-[#0D1B2A]/10 bg-[#EAE0D2]">
        <header className="sticky top-0 z-20 border-b border-[#0D1B2A]/10 bg-[#EAE0D2]/95 px-4 pb-3 pt-4 backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xl font-semibold tracking-tight">TELAOne</p>
              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#0D1B2A]/65">Operational Continuity Runtime</p>
            </div>
            <div className="flex gap-2">
              {['⌕', '◉', '◎'].map((icon, index) => (
                <button
                  key={index}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-[#0D1B2A]/15 bg-[#f0e7da] text-base"
                  aria-label="runtime action"
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
        </header>

        <main className="flex-1 space-y-5 px-4 pb-24 pt-4">
          <section aria-label="Operational memory rail" className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#0D1B2A]/70">Operational Memory Rail</h2>
              <button onClick={loadPearl} className="text-xs font-medium text-[#0D1B2A]/65">Refresh</button>
            </div>
            <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1">
              {MEMORY_RAIL.map((item) => (
                <article
                  key={item.id}
                  className={`min-w-[148px] snap-start rounded-2xl border p-3 ${item.tone === 'gold' ? 'border-[#C4973A]/60 bg-[#fbf5e8]' : 'border-[#0D1B2A]/15 bg-[#f4ecdf]'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className={`h-11 w-11 rounded-full ${item.tone === 'gold' ? 'bg-[#C4973A]/35' : 'bg-[#0D1B2A]/10'}`} />
                    {item.id === 'pearl-drop' && (
                      <button className="flex h-8 w-8 items-center justify-center rounded-full bg-[#C4973A] text-[#0D1B2A]">
                        +
                      </button>
                    )}
                  </div>
                  <p className="mt-3 text-sm font-semibold leading-tight">{item.label}</p>
                  <p className="mt-1 text-xs text-[#0D1B2A]/65">{item.helper}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-[#C4973A]/45 bg-[#fbf5e8] p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em]">Pearl Drop</h3>
            <p className="mt-1 text-sm text-[#0D1B2A]/70">Drop context before it disappears.</p>
            <textarea
              value={pearlText}
              onChange={(e) => setPearlText(e.target.value)}
              placeholder="Capture continuity instantly..."
              className="mt-3 min-h-[96px] w-full rounded-xl border border-[#0D1B2A]/20 bg-[#fffdfa] p-3 text-sm outline-none ring-[#C4973A] focus:ring-2"
            />
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-[#0D1B2A]/60">{pearlLoading ? 'Refreshing continuity…' : `${pearlItems.length} drops in runtime memory`}</p>
              <button onClick={capturePearl} className="min-h-11 rounded-full bg-[#0D1B2A] px-4 py-2 text-sm font-semibold text-[#EAE0D2]">Drop Pearl</button>
            </div>
            {latestPearls.length > 0 && (
              <div className="mt-3 space-y-2">
                {latestPearls.map((item) => (
                  <p key={item.id} className="rounded-xl border border-[#0D1B2A]/10 bg-[#fffdfa] px-3 py-2 text-xs text-[#0D1B2A]/75">{item.content}</p>
                ))}
              </div>
            )}
          </section>

          <section aria-label="Continuity feed" className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#0D1B2A]/70">Continuity Feed</h2>
            {FEED_CARDS.map((card) => (
              <article key={card.id} className="rounded-2xl border border-[#0D1B2A]/14 bg-[#f7f0e4] p-4 shadow-[0_1px_0_rgba(13,27,42,0.08)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold leading-tight">{card.entity}</p>
                    <p className="mt-1 text-sm text-[#0D1B2A]/70">{card.status}</p>
                  </div>
                  <span className="rounded-full border border-[#C4973A]/70 bg-[#f6e6bf] px-2.5 py-1 text-xs font-semibold">{card.unresolvedCount} unresolved</span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-[#0D1B2A]/85">{card.continuitySummary}</p>
                <div className="mt-4 flex items-center justify-between text-xs text-[#0D1B2A]/65">
                  <p>{card.metadata}</p>
                  <p>{card.timestamp}</p>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {card.participants.map((participant) => (
                      <span key={participant} className="flex h-8 w-8 items-center justify-center rounded-full border border-[#EAE0D2] bg-[#0D1B2A] text-[10px] font-semibold text-[#EAE0D2]">{participant}</span>
                    ))}
                  </div>
                  <button className="min-h-11 rounded-full border border-[#0D1B2A]/25 px-4 text-sm font-medium">Open Thread</button>
                </div>
              </article>
            ))}
          </section>
        </main>

        <nav className="fixed bottom-0 left-1/2 z-30 flex w-full max-w-md -translate-x-1/2 border-t border-[#0D1B2A]/10 bg-[#EAE0D2]/98 px-3 py-2 backdrop-blur">
          {['⌂', '⌕', '+', '◌', '◍'].map((icon, index) => (
            <button key={index} className="flex min-h-11 flex-1 items-center justify-center rounded-xl text-[#0D1B2A] text-lg">
              {icon}
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}
