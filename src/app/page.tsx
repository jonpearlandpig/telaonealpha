'use client'
import { useEffect, useState } from 'react'
import { HomeHeader } from '@/components/layout/HomeHeader'
import { ActiveOpsRail } from '@/components/ops/ActiveOpsRail'
import { ContinuityCard } from '@/components/feed/ContinuityCard'
import { BottomNav } from '@/components/layout/BottomNav'
import { AddUpdateSheet } from '@/components/ui/AddUpdateSheet'
import { getNotionContinuityFeed, getNotionOpsRail } from '@/lib/notion/client'
import { subscribeToContinuity } from '@/lib/supabase/realtime'
import type { ContinuityCard as Card, OpsDepartment } from '@/types/feed'

export default function HomePage() {
  const [cards, setCards] = useState<Card[]>([])
  const [ops, setOps] = useState<OpsDepartment[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const load = async () => {
      setCards(await getNotionContinuityFeed())
      setOps(await getNotionOpsRail())
    }
    void load()
    const unsub = subscribeToContinuity(() => void load())
    return unsub
  }, [])

  return <div className='min-h-screen bg-[var(--bg)] text-[var(--text-primary)]'>
    <div className='mx-auto max-w-[460px] pb-[120px]'>
      <HomeHeader />
      <ActiveOpsRail items={ops} />
      <main className='px-6 pt-4 space-y-6'>
        {cards.concat(cards).map((card, idx) => <ContinuityCard key={`${card.id}-${idx}`} card={card} />)}
      </main>
      <BottomNav onAdd={() => setOpen(true)} />
      <AddUpdateSheet open={open} onClose={() => setOpen(false)} />
    </div>
  </div>
}
