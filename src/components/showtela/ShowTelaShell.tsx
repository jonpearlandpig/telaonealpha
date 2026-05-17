'use client'

import { useState } from 'react'
import { ActiveOpsRail } from './ActiveOpsRail'
import { BottomDock } from './BottomDock'
import { ContinuityFeed } from './ContinuityFeed'
import { ContinuitySheet } from './ContinuitySheet'
import { CrusadeOperationsRail } from './CrusadeOperationsRail'
import { FluencyPartnersRail } from './FluencyPartnersRail'
import { ShowTelaHeader } from './ShowTelaHeader'
import { UnresolvedPressureCard } from './UnresolvedPressureCard'
import { computeOperationalPressure } from '@/lib/showtela/pressure'
import type { ShowTelaViewModel } from './types'
import type { ContinuityEvent } from '@/lib/showtela/types'

export function ShowTelaShell({ vm, onPearlDrop }: { vm: ShowTelaViewModel; onPearlDrop: () => void }) {
  const [feed, setFeed] = useState<ContinuityEvent[]>(vm.feed.map((i) => ({ id: i.id, headline: i.title, body: i.summary, timestamp: i.timestamp, owner: { id: i.owner, name: i.owner }, isNew: i.unresolved })))
  const [sheetPerson, setSheetPerson] = useState<string | null>(null)

  const pressure = computeOperationalPressure({
    unresolvedDependencyCount: vm.unresolvedPressure.unresolvedCount,
    staleApprovals: vm.unresolvedPressure.pendingApprovals,
    blockedOperationalObjects: vm.unresolvedPressure.blockedCount,
    timelineRisks: vm.unresolvedPressure.overdueCount,
    financingDelays: vm.continuityObjects.filter((o) => o.title.toLowerCase().includes('finance')).length,
    staffingGaps: vm.continuityObjects.filter((o) => o.title.toLowerCase().includes('staff')).length,
    assumptionsAwaitingValidation: vm.continuityObjects.filter((o) => o.type === 'touring_assumption' && o.status !== 'resolved').length,
    oldestUnresolvedAgeHours: 24,
  })

  const handlePearlDrop = () => {
    onPearlDrop()
    const now = new Date()
    const event: ContinuityEvent = {
      id: `local-${now.getTime()}`,
      headline: 'New continuity note captured',
      body: 'Pearl Drop inserted into operational stream.',
      timestamp: now.toISOString(),
      owner: { id: 'jon', name: 'Jon' },
      isNew: true,
    }
    setFeed((prev) => [event, ...prev])
  }

  return (
    <main className='relative mx-auto min-h-screen w-full max-w-[430px] bg-[#F7F4EF] pb-32 text-[#111111]'>
      <span className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(200,155,47,0.14),transparent_55%)]' />
      <ShowTelaHeader />
      <div onClick={() => setSheetPerson(vm.activeOps[0]?.name ?? 'Operator')}><ActiveOpsRail people={vm.activeOps.map((i) => ({ id: i.id, name: i.name, role: `${i.latest} • ${i.unresolvedCount ?? 0} unresolved • ${pressure.level}`, unresolvedCount: i.unresolvedCount, updatesCount: 0 }))} /></div>
      <FluencyPartnersRail people={vm.fluencyPartners.map((i) => ({ id: i.id, name: i.name, role: i.latest, unresolvedCount: i.unresolvedCount }))} />
      <CrusadeOperationsRail items={vm.crusadeOperations} />
      <UnresolvedPressureCard pressure={vm.unresolvedPressure} />
      {sheetPerson ? <section className='px-7 pt-3'><ContinuitySheet personName={sheetPerson} events={feed} unresolved={vm.continuityObjects.filter((o) => o.type === 'unresolved').map((o) => ({ id: o.id, title: o.title, severity: o.priority as 'low' | 'medium' | 'high', blocking: o.unresolvedImpact > 6, aging: Math.max(1, Math.floor((10 - o.recencyScore) * 2)), operation: o.sourcePage }))} operations={vm.crusadeOperations.map((o) => ({ id: o.id, title: o.label, unresolvedCount: o.unresolvedCount, latestMovement: o.latest }))} /></section> : null}
      <ContinuityFeed feed={feed} />
      <BottomDock onPearlDrop={handlePearlDrop} />
    </main>
  )
}
