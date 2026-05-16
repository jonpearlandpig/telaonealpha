'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { HomeHeader } from '@/components/layout/HomeHeader'
import { ActiveOpsRail } from '@/components/ops/ActiveOpsRail'
import { ContinuityCard } from '@/components/feed/ContinuityCard'
import { BottomNav } from '@/components/layout/BottomNav'
import { AddUpdateSheet } from '@/components/ui/AddUpdateSheet'
import { subscribeToContinuity } from '@/lib/supabase/realtime'
import type { ContinuityCard as Card, OpsDepartment } from '@/types/feed'
import { UnresolvedRail } from './UnresolvedRail'

type Props = { initialCards: Card[]; initialOps: OpsDepartment[] }

export function HomeScreenClient({ initialCards, initialOps }: Props) {
  const [cards, setCards] = useState<Card[]>(initialCards)
  const [ops, setOps] = useState<OpsDepartment[]>(initialOps)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [selectedDept, setSelectedDept] = useState('Executive')
  const [activeTab, setActiveTab] = useState('Home')
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')

  const load = async () => {
    const res = await fetch('/api/home-feed', { cache: 'no-store' })
    if (!res.ok) throw new Error('Failed to refresh live continuity feed')
    const json = (await res.json()) as { cards: Card[]; opsRail: OpsDepartment[] }
    setCards(json.cards)
    setOps(json.opsRail)
  }

  useEffect(() => {
    const unsub = subscribeToContinuity(() => {
      startTransition(() => {
        void load().catch((e: unknown) => setError(e instanceof Error ? e.message : 'Unknown error'))
      })
    })
    return unsub
  }, [])

  const deptCards = useMemo(() => cards.filter((c) => c.department.toLowerCase() === selectedDept.toLowerCase()), [cards, selectedDept])
  const filteredCards = useMemo(() => {
    const pool = deptCards.length ? deptCards : cards
    if (!query.trim()) return pool
    const q = query.toLowerCase()
    return pool.filter((c) => `${c.headline} ${c.summary} ${c.owner} ${c.department} ${c.sourceLabel} ${c.tags.join(' ')}`.toLowerCase().includes(q))
  }, [deptCards, cards, query])

  const grouped = useMemo(() => {
    const activeNow = filteredCards.filter((c) => c.unresolved || c.pinned).slice(0, 8)
    const awaiting = filteredCards.filter((c) => c.unresolved && !c.pinned).slice(0, 8)
    const recently = filteredCards.filter((c) => !c.unresolved).slice(0, 8)
    const resolved = filteredCards.filter((c) => !c.unresolved && (c.summary.toLowerCase().includes('resolved') || c.type === 'Update')).slice(0, 8)
    return [
      { label: 'Active Now', hint: `${activeNow.length} in focus`, items: activeNow },
      { label: 'Awaiting Response', hint: awaiting.length ? 'Awaiting acknowledgement' : 'All clear', items: awaiting },
      { label: 'Recently Updated', hint: pending ? 'Updating now' : 'Ambient continuity pulse', items: recently },
      { label: 'Resolved Today', hint: resolved.length ? `${resolved.length} closed loop${resolved.length > 1 ? 's' : ''}` : 'No resolved items yet', items: resolved },
    ]
  }, [filteredCards, pending])

  const unresolvedCount = filteredCards.filter((c) => c.unresolved).length

  return <div className='min-h-screen bg-[var(--bg)] text-[var(--text-primary)]'>
    <div className='mx-auto max-w-[460px] pb-[136px]'>
      <HomeHeader />
      <ActiveOpsRail items={ops} selected={selectedDept} onSelect={setSelectedDept} />
      <UnresolvedRail items={[
        { id: 'unresolved', label: 'Unresolved', count: String(unresolvedCount), active: true },
        { id: 'awaiting', label: 'Awaiting Response', count: String(grouped[1].items.length) },
        { id: 'approval', label: 'Needs Approval', count: String(filteredCards.filter((c) => c.type === 'Approval' && c.unresolved).length) },
        { id: 'escalated', label: 'Escalated', count: String(filteredCards.filter((c) => c.pinned).length) },
        { id: 'recent', label: 'Recently Updated', count: filteredCards[0]?.timestamp ?? '—' },
      ]} />

      <main className='px-5 pt-6 space-y-10 transition-opacity duration-300'>
        {pending && <p className='text-[11px] text-[var(--text-secondary)] flex items-center gap-2'><span className='h-1.5 w-1.5 rounded-full bg-[var(--gold)] animate-pulse' /> active now · {selectedDept}</p>}
        {error && <p className='text-sm text-[var(--gold)]'>{error}</p>}
        {!pending && filteredCards.length === 0 && <p className='text-sm text-[var(--text-secondary)]'>No continuity objects found for this operational view.</p>}

        {grouped.map((section) => section.items.length > 0 && (
          <section key={section.label} className='space-y-4'>
            <div className='flex items-end justify-between px-1'>
              <h2 className='text-[10px] uppercase tracking-[0.2em] text-[var(--text-tertiary)]'>{section.label}</h2>
              <p className='text-[11px] text-[var(--text-secondary)]/90'>{section.hint}</p>
            </div>
            <div className='space-y-4'>
              {section.items.map((card) => <ContinuityCard key={`${section.label}-${card.id}`} card={card} />)}
            </div>
          </section>
        ))}
      </main>

      {searchOpen && <div className='fixed inset-0 z-50 bg-black/15 backdrop-blur-[2px] p-4' onClick={() => setSearchOpen(false)}>
        <div className='mx-auto max-w-[460px] bg-white rounded-3xl p-4 shadow-[var(--shadow-floating)]' onClick={(e)=>e.stopPropagation()}>
          <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder='Search people, decisions, venues, unresolved…' className='w-full min-h-11 rounded-xl border border-[var(--border)] px-3' />
        </div>
      </div>}

      <BottomNav onAdd={() => setOpen(true)} active={activeTab} onTab={(tab) => { setActiveTab(tab); if (tab === 'Search') setSearchOpen(true) }} />
      <AddUpdateSheet open={open} onClose={() => setOpen(false)} />
    </div>
  </div>
}
