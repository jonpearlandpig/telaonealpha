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
  image: string
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
  image: string
  stateLabel: string
}

const MEMORY_RAIL: MemoryRailItem[] = [
  { id: 'pearl-drop', label: 'You / Pearl Drop', helper: 'Capture continuity instantly', tone: 'gold', image: 'radial-gradient(circle at 35% 25%, #f8d48c 0%, #c4973a 42%, #70521a 100%)' },
  { id: 'crusade', label: 'Crusade', helper: '3 unresolved threads', tone: 'navy', image: 'linear-gradient(135deg, #3a5268 0%, #162433 62%, #0d1b2a 100%)' },
  { id: 'rodney', label: 'Rodney Jerkins', helper: 'Routing thread active', tone: 'navy', image: 'linear-gradient(155deg, #6e8595 0%, #273b50 45%, #0d1b2a 100%)' },
  { id: 'tourtext', label: 'TourText', helper: 'Lineage updated', tone: 'navy', image: 'linear-gradient(140deg, #607f8c 0%, #273746 50%, #0d1b2a 100%)' },
  { id: 'pearl-box', label: 'Pearl Box', helper: 'Memory depth indexed', tone: 'navy', image: 'linear-gradient(130deg, #8f7f5d 0%, #50462f 52%, #1f2730 100%)' },
  { id: 'runtime', label: 'TELA Runtime', helper: 'Operational state stable', tone: 'navy', image: 'linear-gradient(145deg, #7d7c73 0%, #37404c 46%, #0d1b2a 100%)' },
]

const FEED_CARDS: FeedCard[] = [
  {
    id: '1',
    entity: 'Crusade Routing',
    status: 'Backline reroute still pending before call time.',
    continuitySummary: 'Reconfirm shuttle handoff and stage-right credential transfer; unresolved branch is now the highest continuity risk in venue ops.',
    unresolvedCount: 2,
    participants: ['JH', 'RC', 'TM'],
    metadata: 'Thread · Venue Ops · Artifact lineage linked',
    timestamp: '12m ago',
    image: 'linear-gradient(150deg, #7f8a94 0%, #44515f 36%, #1f2e3f 68%, #0d1b2a 100%)',
    stateLabel: 'Unresolved handoff pressure',
  },
  {
    id: '2',
    entity: 'Rodney Session Timeline',
    status: 'Session continuity retained; one approval branch open.',
    continuitySummary: 'Arrangement decisions and producer notes stayed aligned through intake; pending signoff path remains visible and recoverable.',
    unresolvedCount: 1,
    participants: ['RJ', 'JH', 'PC'],
    metadata: 'Entity · Session Memory · Provenance verified',
    timestamp: '35m ago',
    image: 'linear-gradient(145deg, #91958c 0%, #63695f 35%, #2d3b4b 66%, #0d1b2a 100%)',
    stateLabel: 'Continuity intact',
  },
  {
    id: '3',
    entity: 'TourText Launch',
    status: 'Execution window open with routed next actions.',
    continuitySummary: 'Voice intake and launch brief are now merged; rollout momentum is stable but unresolved partner dependency remains active.',
    unresolvedCount: 3,
    participants: ['TL', 'MK', 'JH'],
    metadata: 'Program · Runtime Thread · Freshness high',
    timestamp: '1h ago',
    image: 'linear-gradient(150deg, #9d8d6a 0%, #65563e 34%, #334455 70%, #0d1b2a 100%)',
    stateLabel: 'Active execution window',
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
    const frame = window.requestAnimationFrame(() => {
      void doSync()
      void loadPearl()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [doSync, loadPearl])

  const latestPearls = useMemo(() => pearlItems.slice(0, 2), [pearlItems])

  return (
    <div className="min-h-screen bg-[#EAE0D2] text-[#0D1B2A]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-[#EAE0D2]">
        <header className="sticky top-0 z-20 border-b border-[#0D1B2A]/10 bg-[#EAE0D2]/95 px-4 pb-3 pt-4 backdrop-blur-md">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[28px] font-semibold leading-none tracking-tight">TELAOne</p>
              <p className="mt-1.5 text-[11px] uppercase tracking-[0.2em] text-[#0D1B2A]/65">Home Runtime · Continuity-first</p>
            </div>
            <button onClick={doSync} className="h-11 rounded-full border border-[#0D1B2A]/20 bg-[#f2e8d8] px-4 text-xs font-semibold uppercase tracking-[0.14em] text-[#0D1B2A]/80">{syncing ? 'Syncing' : 'Sync'}</button>
          </div>
        </header>

        <main className="flex-1 space-y-5 px-4 pb-24 pt-4">
          <section aria-label="Operational memory rail" className="space-y-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0D1B2A]/70">Operational Memory Rail</h2>
            <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
              {MEMORY_RAIL.map((item) => (
                <article
                  key={item.id}
                  className={`min-w-[164px] snap-start overflow-hidden rounded-[22px] border shadow-[0_8px_22px_rgba(13,27,42,0.12)] transition-transform duration-200 active:scale-[0.985] ${item.tone === 'gold' ? 'border-[#C4973A]/55 bg-[#fbf5e8]' : 'border-[#0D1B2A]/12 bg-[#f4ecdf]'}`}
                >
                  <div className="h-24 w-full" style={{ background: item.image }} />
                  <div className="space-y-1.5 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold leading-tight">{item.label}</p>
                      {item.id === 'pearl-drop' && <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#C4973A] text-sm font-bold">+</span>}
                    </div>
                    <p className="text-xs text-[#0D1B2A]/65">{item.helper}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[24px] border border-[#C4973A]/45 bg-[#fbf5e8] p-4 shadow-[0_8px_24px_rgba(13,27,42,0.08)]">
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.17em]">Pearl Drop</h3>
            <p className="mt-1 text-sm text-[#0D1B2A]/70">Catch the moment before continuity fragments.</p>
            <textarea value={pearlText} onChange={(e) => setPearlText(e.target.value)} placeholder="Capture continuity instantly..." className="mt-3 min-h-[92px] w-full rounded-2xl border border-[#0D1B2A]/18 bg-[#fffdf8] p-3 text-sm outline-none ring-[#C4973A] focus:ring-2" />
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-[#0D1B2A]/62">{pearlLoading ? 'Refreshing continuity…' : `${pearlItems.length} drops in runtime memory`}</p>
              <button onClick={capturePearl} className="min-h-11 rounded-full bg-[#0D1B2A] px-4 py-2 text-sm font-semibold text-[#EAE0D2]">Drop Pearl</button>
            </div>
            {latestPearls.length > 0 && <div className="mt-3 space-y-2">{latestPearls.map((item) => <p key={item.id} className="rounded-xl border border-[#0D1B2A]/10 bg-[#fffdfa] px-3 py-2 text-xs text-[#0D1B2A]/75">{item.content}</p>)}</div>}
          </section>

          <section aria-label="Continuity feed" className="space-y-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0D1B2A]/70">Continuity Feed</h2>
            {FEED_CARDS.map((card) => (
              <article key={card.id} className="overflow-hidden rounded-[24px] border border-[#0D1B2A]/14 bg-[#f7f0e4] shadow-[0_10px_28px_rgba(13,27,42,0.12)] transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0">
                <div className="relative h-44 w-full" style={{ background: card.image }}>
                  <span className="absolute left-3 top-3 rounded-full bg-[#0D1B2A]/72 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#EAE0D2]">{card.stateLabel}</span>
                  <span className="absolute bottom-3 right-3 rounded-full bg-[#f4e3bd] px-2.5 py-1 text-[11px] font-semibold text-[#0D1B2A]">{card.unresolvedCount} unresolved</span>
                </div>
                <div className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[21px] font-semibold leading-tight tracking-tight">{card.entity}</p>
                      <p className="mt-1 text-sm text-[#0D1B2A]/75">{card.status}</p>
                    </div>
                    <p className="pt-1 text-xs text-[#0D1B2A]/58">{card.timestamp}</p>
                  </div>
                  <p className="text-sm leading-relaxed text-[#0D1B2A]/86">{card.continuitySummary}</p>
                  <p className="text-[11px] uppercase tracking-[0.12em] text-[#0D1B2A]/55">{card.metadata}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex -space-x-2">{card.participants.map((participant) => <span key={participant} className="flex h-8 w-8 items-center justify-center rounded-full border border-[#EAE0D2] bg-[#0D1B2A] text-[10px] font-semibold text-[#EAE0D2]">{participant}</span>)}</div>
                    <button className="min-h-11 rounded-full border border-[#0D1B2A]/25 bg-[#f8f2e8] px-4 text-sm font-medium">Open Thread</button>
                  </div>
                </div>
              </article>
            ))}
          </section>
        </main>
      </div>
    </div>
  )
}
