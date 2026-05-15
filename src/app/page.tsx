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
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col border-x border-[#0D1B2A]/10 bg-[#EAE0D2]">
        <header className="sticky top-0 z-20 border-b border-[#0D1B2A]/12 bg-[#EAE0D2]/95 px-5 pb-4 pt-5 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-[27px] font-semibold leading-none tracking-[-0.02em]">TELAOne</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#0D1B2A]/62">Operational Continuity Runtime</p>
            </div>
            <div className="flex items-center gap-2 pt-0.5">
              {[
                { label: 'Search', icon: '⌕' },
                { label: 'Notifications', icon: '◉' },
                { label: 'Runtime Sync', icon: syncing ? '↻' : '◎' },
              ].map((action) => (
                <button
                  key={action.label}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-[#0D1B2A]/15 bg-[#F3EBDD] text-[17px]"
                  aria-label={action.label}
                  onClick={action.label === 'Runtime Sync' ? doSync : undefined}
                >
                  {action.icon}
                </button>
              ))}
            </div>
          </div>
        </header>

        <main className="flex-1 space-y-7 px-5 pb-28 pt-5">
          <section className="space-y-3" aria-label="Operational Memory Rail">
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0D1B2A]/68">Operational Memory Rail</h2>
              <button onClick={loadPearl} className="min-h-11 px-1 text-xs font-medium text-[#0D1B2A]/62">Refresh</button>
            </div>
            <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
              {MEMORY_RAIL.map((item) => (
                <article
                  key={item.id}
                  className={`relative min-w-[160px] snap-start rounded-[20px] border px-3.5 py-3 ${item.kind === 'pearl' ? 'border-[#C4973A]/65 bg-[#FBF4E5]' : 'border-[#0D1B2A]/14 bg-[#F4ECDF]'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="relative">
                      <div className={`h-14 w-14 rounded-full border ${item.kind === 'pearl' ? 'border-[#C4973A]/70 bg-[#F3E1B9]' : 'border-[#0D1B2A]/15 bg-[#E8DECF]'}`} />
                      {item.active && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border border-[#FBF4E5] bg-[#C4973A]" />}
                    </div>
                    {item.unresolved ? (
                      <span className="rounded-full border border-[#C4973A]/70 bg-[#F6E4BA] px-2 py-0.5 text-[10px] font-semibold">{item.unresolved}</span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-[12.5px] font-semibold leading-tight">{item.label}</p>
                  <p className="mt-1 text-[11px] leading-snug text-[#0D1B2A]/65">{item.helper}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[22px] border border-[#C4973A]/50 bg-[#FBF5E8] px-4 pb-4 pt-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.17em] text-[#0D1B2A]/72">Pearl Drop</p>
            <p className="mt-1 text-sm leading-snug text-[#0D1B2A]/72">Drop context before it disappears.</p>
            <textarea
              value={pearlText}
              onChange={(e) => setPearlText(e.target.value)}
              placeholder="Capture continuity instantly..."
              className="mt-3 min-h-[108px] w-full rounded-2xl border border-[#0D1B2A]/18 bg-[#FFFCF5] px-3.5 py-3 text-sm leading-relaxed outline-none ring-[#C4973A] focus:ring-2"
            />
            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="text-[11px] text-[#0D1B2A]/60">{pearlLoading ? 'Refreshing continuity…' : `${pearlItems.length} drops in runtime memory`}</p>
              <button onClick={capturePearl} className="min-h-11 rounded-full bg-[#0D1B2A] px-4.5 py-2 text-sm font-semibold text-[#EAE0D2]">Drop Pearl</button>
            </div>
            {latestPearls.length > 0 && (
              <div className="mt-3 space-y-2">
                {latestPearls.map((item) => (
                  <p key={item.id} className="rounded-xl border border-[#0D1B2A]/10 bg-[#FFFCF5] px-3 py-2 text-xs leading-relaxed text-[#0D1B2A]/78">{item.content}</p>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3" aria-label="Continuity Feed">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0D1B2A]/68">Continuity Feed</h2>
            {FEED_CARDS.map((card) => (
              <article key={card.id} className="rounded-[22px] border border-[#0D1B2A]/14 bg-[#F8F1E4] p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 shrink-0 rounded-xl border border-[#0D1B2A]/12 bg-[#E5D7C3]" />
                    <div>
                      <p className="text-[16px] font-semibold leading-tight tracking-[-0.01em]">{card.entity}</p>
                      <p className="mt-1 text-[13px] leading-tight text-[#0D1B2A]/72">{card.status}</p>
                    </div>
                  </div>
                  <span className="rounded-full border border-[#C4973A]/65 bg-[#F6E4BA] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide">{card.unresolvedCount} unresolved</span>
                </div>
                <p className="text-[14px] leading-relaxed text-[#0D1B2A]/85">{card.continuitySummary}</p>
                <div className="mt-4 flex items-center justify-between text-[11px] text-[#0D1B2A]/62">
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

        <nav className="fixed bottom-0 left-1/2 z-30 flex w-full max-w-md -translate-x-1/2 border-t border-[#0D1B2A]/12 bg-[#EAE0D2]/98 px-3 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-sm">
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
              className={`flex min-h-11 flex-1 items-center justify-center rounded-xl text-lg ${item.label === 'Create' ? 'bg-[#0D1B2A] text-[#EAE0D2]' : 'text-[#0D1B2A]'}`}
            >
              {item.icon}
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}
