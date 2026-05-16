'use client'

import { useEffect, useState, useTransition } from 'react'
import { HomeHeader } from '@/components/layout/HomeHeader'
import { ActiveOpsRail } from '@/components/ops/ActiveOpsRail'
import { ContinuityCard } from '@/components/feed/ContinuityCard'
import { BottomNav } from '@/components/layout/BottomNav'
import { AddUpdateSheet } from '@/components/ui/AddUpdateSheet'
import { subscribeToContinuity } from '@/lib/supabase/realtime'
import type { ContinuityCard as Card, OpsDepartment } from '@/types/feed'

type Props = { initialCards: Card[]; initialOps: OpsDepartment[] }

export function HomeScreenClient({ initialCards, initialOps }: Props) {
  const [cards, setCards] = useState<Card[]>(initialCards)
  const [ops, setOps] = useState<OpsDepartment[]>(initialOps)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const load = async () => {
    const res = await fetch('/api/showtela/feed', { cache: 'no-store' })
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

  return <div className='min-h-screen bg-[var(--bg)] text-[var(--text-primary)]'>
    <div className='mx-auto max-w-[460px] pb-[120px]'>
      <HomeHeader />
      <ActiveOpsRail items={ops} />
      <main className='px-6 pt-4 space-y-6'>
        {pending && <p className='text-sm text-[var(--text-secondary)]'>Refreshing live operations…</p>}
        {error && <p className='text-sm text-[var(--gold)]'>{error}</p>}
        {!pending && cards.length === 0 && <p className='text-sm text-[var(--text-secondary)]'>No continuity objects yet in Operational Updates.</p>}
        {cards.map((card) => <ContinuityCard key={card.id} card={card} />)}
      </main>
      <BottomNav onAdd={() => setOpen(true)} />
      <AddUpdateSheet open={open} onClose={() => setOpen(false)} />
    </div>
  </div>
}
