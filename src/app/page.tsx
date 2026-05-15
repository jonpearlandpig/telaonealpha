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
  tone: 'gold' | 'active' | 'dormant'
  unresolved?: number
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
  { id: 'pearl-drop', label: 'You / Pearl Drop', helper: 'Capture continuity instantly', tone: 'gold', image: 'radial-gradient(circle at 38% 26%, #D8B46A 0%, #C4973A 52%, #8b6a2d 100%)' },
  { id: 'crusade', label: 'Crusade', helper: 'Routing pressure', unresolved: 3, tone: 'active', image: 'linear-gradient(155deg, #8A8175 0%, #3A4754 52%, #0D1B2A 100%)' },
  { id: 'rodney', label: 'Rodney Jerkins', helper: 'Session continuity', unresolved: 1, tone: 'active', image: 'linear-gradient(145deg, #6C7884 0%, #3A4754 58%, #0D1B2A 100%)' },
  { id: 'tourtext', label: 'TourText', helper: 'Launch branch open', unresolved: 2, tone: 'dormant', image: 'linear-gradient(150deg, #8A8175 0%, #6C7884 52%, #0D1B2A 100%)' },
  { id: 'pearl-box', label: 'Pearl Box', helper: 'Lineage indexed', tone: 'dormant', image: 'linear-gradient(150deg, #8A8175 0%, #6C7884 50%, #3A4754 100%)' },
  { id: 'runtime', label: 'TELA Runtime', helper: 'Operationally calm', tone: 'dormant', image: 'linear-gradient(145deg, #6C7884 0%, #3A4754 50%, #0D1B2A 100%)' },
]

const FEED_CARDS: FeedCard[] = [
  {
    id: '1', entity: 'Crusade Routing', status: 'Backline reroute pending before call time.', continuitySummary: 'Shuttle handoff and stage-right credential transfer remain unresolved; this branch now holds highest operational gravity.', unresolvedCount: 2, participants: ['JH', 'RC', 'TM'], metadata: 'Thread · Venue Ops · Artifact lineage linked', timestamp: '12m ago', image: 'linear-gradient(160deg, #8A8175 0%, #6C7884 38%, #3A4754 72%, #0D1B2A 100%)', stateLabel: 'Unresolved handoff pressure',
  },
  {
    id: '2', entity: 'Rodney Session Timeline', status: 'Continuity retained; one approval branch open.', continuitySummary: 'Arrangement decisions stayed aligned through intake. Remaining signoff path is visible and ready for fast thread recovery.', unresolvedCount: 1, participants: ['RJ', 'JH', 'PC'], metadata: 'Entity · Session Memory · Provenance verified', timestamp: '35m ago', image: 'linear-gradient(150deg, #D8B46A 0%, #8A8175 32%, #6C7884 64%, #0D1B2A 100%)', stateLabel: 'Continuity intact',
  },
  {
    id: '3', entity: 'TourText Launch', status: 'Execution window open with active momentum.', continuitySummary: 'Voice intake and launch brief are merged. Partner dependency remains unresolved but continuity map is stable and current.', unresolvedCount: 3, participants: ['TL', 'MK', 'JH'], metadata: 'Program · Runtime Thread · Freshness high', timestamp: '1h ago', image: 'linear-gradient(155deg, #C4973A 0%, #8A8175 34%, #6C7884 68%, #0D1B2A 100%)', stateLabel: 'Active execution window',
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
      await fetch('/api/pearl-box', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content, source: 'PEARL_DROP' }) })
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
      <div className="mx-auto flex min-h-screen w-full max-w-[393px] flex-col bg-[#EAE0D2]">
        <header className="sticky top-0 z-20 border-b border-[rgba(13,27,42,0.08)] bg-[#EAE0D2]/93 px-5 pb-2.5 pt-3 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[27px] font-semibold leading-none tracking-[-0.02em]">TELAOne</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[#6C7884]">Home Runtime · Continuity First</p>
            </div>
            <button onClick={doSync} className="flex h-10 w-10 items-center justify-center rounded-full border border-[#C4973A]/50 bg-[#F8F2E8] text-[10px] font-semibold uppercase tracking-[0.08em] text-[#3A4754] active:scale-[0.97]">{syncing ? '•••' : '⟳'}</button>
          </div>
        </header>

        <main className="flex-1 space-y-4 px-4 pb-24 pt-3">
          <section className="space-y-2.5" aria-label="Operational memory rail">
            <p className="px-1 text-[10px] uppercase tracking-[0.16em] text-[#6C7884]">Operational Memory</p>
            <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [scroll-behavior:smooth] [&::-webkit-scrollbar]:hidden" style={{ WebkitOverflowScrolling: 'touch' }}>
              {MEMORY_RAIL.map((item) => (
                <button
                  key={item.id}
                  className="min-w-[88px] snap-start text-center outline-none active:scale-[0.975]"
                  aria-label={item.label}
                >
                  <div className={`relative mx-auto h-[74px] w-[74px] rounded-full p-[2px] shadow-[0_4px_10px_rgba(13,27,42,0.06)] ${item.tone === 'gold' ? 'bg-[#C4973A] shadow-[0_0_0_1px_rgba(216,180,106,0.28),0_6px_14px_rgba(196,151,58,0.22)]' : 'bg-[#D8B46A]'}`}>
                    <div
                      className={`relative h-full w-full rounded-full border border-[rgba(13,27,42,0.08)] ${item.id === 'pearl-drop' ? 'bg-[#F8F2E8]' : ''}`}
                      style={item.id === 'pearl-drop' ? undefined : { background: item.image }}
                    >
                      {item.unresolved ? (
                        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border border-[#EAE0D2] bg-[#B84C3D] px-1 text-[9px] font-semibold text-[#F8F2E8]">
                          {item.unresolved}
                        </span>
                      ) : null}
                      {item.id === 'pearl-drop' ? (
                        <span className="absolute inset-0 flex items-center justify-center text-[26px] font-medium leading-none text-[#C4973A]">+</span>
                      ) : null}
                    </div>
                  </div>
                  <p className="mt-1.5 line-clamp-1 text-center text-[11px] font-medium leading-tight text-[#0D1B2A]">{item.label}</p>
                  <p className="mt-0.5 line-clamp-1 text-center text-[10px] leading-tight text-[#6C7884]">{item.helper}</p>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-[20px] border border-[rgba(13,27,42,0.08)] bg-[#F8F2E8] p-3.5 shadow-[0_8px_20px_rgba(13,27,42,0.06)]">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em]">Pearl Drop</h3>
                <p className="mt-0.5 text-xs text-[#6C7884]">Preserve this before the thread slips.</p>
              </div>
              <button onClick={capturePearl} className="min-h-9 rounded-full bg-[#0D1B2A] px-3.5 text-xs font-semibold text-[#F8F2E8] active:scale-[0.98]">Drop</button>
            </div>
            <textarea autoFocus value={pearlText} onChange={(e) => setPearlText(e.target.value)} placeholder="Capture continuity instantly..." className="mt-2.5 min-h-[78px] w-full rounded-2xl border border-[rgba(13,27,42,0.08)] bg-[#FBF7F0] p-3 text-sm text-[#3A4754] outline-none ring-[#C4973A]/45 focus:ring-2" />
            <p className="mt-2 text-[10px] text-[#6C7884]">{pearlLoading ? 'Refreshing continuity…' : `${pearlItems.length} drops in runtime memory`}</p>
            {latestPearls.length > 0 ? (
              <div className="mt-2 space-y-1.5">
                {latestPearls.map((item) => (
                  <p key={item.id} className="rounded-xl border border-[rgba(13,27,42,0.08)] bg-[#FBF7F0] px-2.5 py-2 text-[11px] text-[#3A4754]">
                    {item.content}
                  </p>
                ))}
              </div>
            ) : null}
          </section>

          <section className="space-y-2.5" aria-label="Continuity feed">
            <p className="px-1 text-[10px] uppercase tracking-[0.16em] text-[#6C7884]">Continuity Feed</p>
            {FEED_CARDS.map((card) => (
              <article key={card.id} className="overflow-hidden rounded-[22px] border border-[rgba(13,27,42,0.08)] bg-[#FBF7F0] shadow-[0_9px_22px_rgba(13,27,42,0.06)] transition duration-200 active:scale-[0.992]">
                <div className="relative h-48 w-full" style={{ background: card.image }}>
                  <span className="absolute left-3 top-3 rounded-full bg-[#F8F2E8]/94 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#3A4754]">{card.stateLabel}</span>
                  <span className="absolute bottom-3 right-3 rounded-full border border-[#D8B46A]/45 bg-[#F8F2E8] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#3A4754]">{card.unresolvedCount} unresolved</span>
                </div>
                <div className="space-y-2.5 p-3.5">
                  <div className="flex items-start justify-between gap-2.5">
                    <div>
                      <p className="text-[24px] font-semibold leading-[1.04] tracking-[-0.02em]">{card.entity}</p>
                      <p className="mt-1 text-[13px] text-[#3A4754]">{card.status}</p>
                    </div>
                    <p className="pt-1 text-[10px] uppercase tracking-[0.1em] text-[#6C7884]">{card.timestamp}</p>
                  </div>
                  <p className="text-[13px] leading-[1.45] text-[#3A4754]">{card.continuitySummary}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-[0.11em] text-[#6C7884]">{card.metadata}</p>
                    <div className="flex -space-x-1.5">{card.participants.map((participant) => <span key={participant} className="flex h-6 w-6 items-center justify-center rounded-full border border-[#F8F2E8] bg-[#3A4754] text-[9px] font-semibold text-[#F8F2E8]">{participant}</span>)}</div>
                  </div>
                </div>
              </article>
            ))}
          </section>
        </main>

        <nav className="fixed bottom-0 left-1/2 z-30 flex w-full max-w-[393px] -translate-x-1/2 border-t border-[rgba(13,27,42,0.08)] bg-[#EAE0D2]/96 px-2.5 py-2 backdrop-blur">
          {['⌂', '⌕', '＋', '◌', '◍'].map((icon, index) => (
            <button key={icon} className={`flex min-h-11 flex-1 items-center justify-center rounded-xl text-[#3A4754] ${index === 2 ? 'mx-0.5 border border-[#C4973A]/40 bg-[#F8F2E8] text-[#0D1B2A]' : 'active:bg-[#F8F2E8]/80'}`}>
              <span className="text-lg leading-none">{icon}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}
