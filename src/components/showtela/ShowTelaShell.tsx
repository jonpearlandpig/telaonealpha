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
import type { ShowTelaViewModel } from './types'
import type { ContinuityEvent } from '@/lib/showtela/types'

export function ShowTelaShell({ vm, onPearlDrop }: { vm: ShowTelaViewModel; onPearlDrop: () => void }) {
  const [feed, setFeed] = useState<ContinuityEvent[]>(vm.feed.map((i) => ({ id: i.id, headline: i.title, body: i.summary, timestamp: i.timestamp, owner: { id: i.owner, name: i.owner }, isNew: i.unresolved })))
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetTitle, setSheetTitle] = useState('')
  const [sheetRole, setSheetRole] = useState('')
  const [sheetSummary, setSheetSummary] = useState('')
  const [sheetRhythm, setSheetRhythm] = useState('')


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

  const openSheet = (title: string, role: string, summary: string, rhythm = 'Daily communication rhythm') => {
    setSheetTitle(title)
    setSheetRole(role)
    setSheetSummary(summary)
    setSheetRhythm(rhythm)
    setSheetOpen(true)
  }

  const unresolvedCount = vm.continuityObjects.filter((o) => o.type === 'unresolved').length + feed.filter((item) => item.isNew).length

  return (
    <main className='relative mx-auto min-h-screen w-full max-w-[430px] bg-[#F7F4EF] pb-32 text-[#111111]'>
      <span className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(200,155,47,0.14),transparent_55%)]' />
      <ShowTelaHeader />
      <ActiveOpsRail onSelect={(id) => { const person = vm.activeOps.find((i) => i.id === id); openSheet(person?.name ?? 'Operator', person?.latest ?? 'Active Ops', `${person?.unresolvedCount ?? 0} unresolved items linked to active operator continuity.`, 'Hourly communication rhythm') }} people={vm.activeOps.map((i) => ({ id: i.id, name: i.name, role: `${i.latest} • ${i.unresolvedCount ?? 0} unresolved`, unresolvedCount: i.unresolvedCount, updatesCount: feed.filter((f) => f.owner?.name === i.name).length }))} />
      <FluencyPartnersRail onSelect={(id) => { const person = vm.fluencyPartners.find((i) => i.id === id); openSheet(person?.name ?? 'Partner', person?.latest ?? 'Fluency Partner', `${person?.unresolvedCount ?? 0} unresolved partner dependencies and relationship notes.`, 'Daily partner rhythm') }} people={vm.fluencyPartners.map((i) => ({ id: i.id, name: i.name, role: i.latest, unresolvedCount: i.unresolvedCount }))} />
      <CrusadeOperationsRail onSelect={(id) => { const op = vm.crusadeOperations.find((i) => i.id === id); openSheet(op?.label ?? 'Operation', op?.latest ?? 'Operational stream', `${op?.unresolvedCount ?? 0} unresolved dependencies. Latest continuity from ${op?.label ?? 'operation'} stream.`, 'Shift-based updates') }} items={vm.crusadeOperations} />
      <UnresolvedPressureCard pressure={vm.unresolvedPressure} />
      <ContinuitySheet open={sheetOpen} onClose={() => setSheetOpen(false)} personName={sheetTitle} role={sheetRole} latestContinuity={sheetSummary} communicationRhythm={sheetRhythm} notes={`Linked continuity: ${feed.slice(0, 3).map((e) => e.headline).join(' · ') || 'No linked continuity yet.'}`} events={feed} unresolved={vm.continuityObjects.filter((o) => o.type === 'unresolved').map((o) => ({ id: o.id, title: o.title, severity: o.priority as 'low' | 'medium' | 'high', blocking: o.unresolvedImpact > 6, aging: Math.max(1, Math.floor((10 - o.recencyScore) * 2)), operation: o.sourcePage }))} operations={vm.crusadeOperations.map((o) => ({ id: o.id, title: o.label, unresolvedCount: o.unresolvedCount, latestMovement: o.latest }))} />
      <ContinuityFeed onSelect={(item) => openSheet(item.headline, item.owner?.name ?? 'Continuity event', item.body ?? 'No body', 'Event-triggered rhythm')} feed={feed} />
      <BottomDock onPearlDrop={handlePearlDrop} />
      <div className='fixed bottom-24 right-5 rounded-full border border-[#D6BD90] bg-[#17120F]/90 px-3 py-1 text-[10px] text-[#F5E8CA] shadow-[0_10px_24px_rgba(0,0,0,0.28)]'>{unresolvedCount} unresolved live</div>
    </main>
  )
}
