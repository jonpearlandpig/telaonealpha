'use client'
import { useEffect, useState } from 'react'
import { ActiveOpsRail } from './ActiveOpsRail'
import { BottomDock } from './BottomDock'
import { ContinuityFeed } from './ContinuityFeed'
import { CrusadeOperationsRail } from './CrusadeOperationsRail'
import { FluencyPartnersRail } from './FluencyPartnersRail'
import { ShowTelaHeader } from './ShowTelaHeader'
import { UnresolvedPressureCard } from './UnresolvedPressureCard'
import type { ShowTelaViewModel } from './types'
import type { ContinuityEvent } from '@/lib/showtela/types'

export function ShowTelaShell({ vm, onPearlDrop }: { vm: ShowTelaViewModel; onPearlDrop: () => void }) {
  const [feed, setFeed] = useState<ContinuityEvent[]>(
    vm.feed.map((i) => ({
      id: i.id, headline: i.title, body: i.summary,
      timestamp: i.timestamp, image: i.image, tags: i.linkedEntities ?? [],
      owner: { id: i.owner, name: i.owner }, isNew: i.unresolved,
      pressure: i.unresolved ? ('high' as const) : ('low' as const),
    }))
  )

  useEffect(() => {
    window.localStorage.setItem('showtela:lastViewedAt', String(Date.now()))
  }, [])

  const handlePearlDrop = () => {
    onPearlDrop()
    const now = new Date()
    setFeed((prev) => [{
      id: `local-${now.getTime()}`, headline: 'New continuity note captured',
      body: 'Pearl Drop inserted into operational stream.',
      timestamp: now.toISOString(), owner: { id: 'jon', name: 'Jon' }, isNew: true,
    }, ...prev])
  }

  return (
    <main className="relative mx-auto min-h-screen w-full max-w-[430px] bg-[#F8F6F2] pb-36 text-[#141210]">
      <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-5%,rgba(200,155,47,0.10),transparent_50%)]" />
      <ShowTelaHeader />
      <ActiveOpsRail items={vm.activeOps.map((i) => ({ id: i.id, name: i.name, latest: i.latest, unresolvedCount: i.unresolvedCount ?? 0, image: i.image, updatesCount: 0 }))} />
      <FluencyPartnersRail items={vm.fluencyPartners.map((i) => ({ id: i.id, name: i.name, label: i.name, unresolvedCount: i.unresolvedCount ?? 0, image: i.image }))} />
      <CrusadeOperationsRail items={vm.crusadeOperations} />
      <UnresolvedPressureCard pressure={vm.unresolvedPressure} />
      <ContinuityFeed feed={feed} />
      <BottomDock onPearlDrop={handlePearlDrop} />
    </main>
  )
}
