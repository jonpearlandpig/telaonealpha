'use client'

import { useEffect, useMemo, useState } from 'react'
import { ActiveOpsRail } from './ActiveOpsRail'
import { BottomDock } from './BottomDock'
import { ContinuityFeed } from './ContinuityFeed'
import { CrusadeOperationsRail } from './CrusadeOperationsRail'
import { FluencyPartnersRail } from './FluencyPartnersRail'
import { ShowTelaHeader } from './ShowTelaHeader'
import { UnresolvedPressureCard } from './UnresolvedPressureCard'
import { ContinuitySheet } from './ContinuitySheet'
import type { ShowTelaViewModel } from './types'
import type { ContinuityEvent } from '@/lib/showtela/types'

export function ShowTelaShell({ vm, onPearlDrop }: { vm: ShowTelaViewModel; onPearlDrop: () => void }) {
  const [feed, setFeed] = useState<ContinuityEvent[]>(vm.feed.map((i) => ({ id: i.id, headline: i.title, body: i.summary, timestamp: i.timestamp, owner: { id: i.owner, name: i.owner }, isNew: i.unresolved, waitingOn: i.waitingOn, blockedBy: i.blockedBy, approvalOwner: i.approvalOwner, lastContactAt: i.lastContactAt, trustLevel: i.trustLevel, operationalRisk: i.operationalRisk, unresolvedDependencies: i.unresolvedDependencies, linkedEntities: i.linkedEntities, linkedThreads: i.linkedThreads, attachments: i.attachments })))
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetTitle, setSheetTitle] = useState('')
  const [sheetRole, setSheetRole] = useState('')
  const [sheetSummary, setSheetSummary] = useState('')
  const [sheetRhythm, setSheetRhythm] = useState('')
  const [sheetPerson, setSheetPerson] = useState<string | null>(null)
  const [lastViewedAt] = useState<number>(() => (typeof window === 'undefined' ? 0 : Number(window.localStorage.getItem('showtela:lastViewedAt') || '0')))

  useEffect(() => {
    window.localStorage.setItem('showtela:lastViewedAt', String(Date.now()))
    window.localStorage.setItem('showtela:latestTimelineTimestamp', vm.runtimeTimeline[0]?.timestamp ?? '')
    window.localStorage.setItem('showtela:viewedContinuityIds', JSON.stringify(feed.slice(0, 20).map((i) => i.id)))
  }, [vm.runtimeTimeline, feed])

  const changedSinceLastOpen = useMemo(() => feed.filter((item) => new Date(item.timestamp ?? 0).getTime() > lastViewedAt).length, [feed, lastViewedAt])

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

  const openSheet = (personId: string, personName: string, personRole?: string) => {
    const personEvents = feed.filter((e) => e.owner?.name === personName || e.owner?.id === personId)
    const continuityObject = vm.continuityObjects.find((o) => o.owner === personName || o.title === personName)
    const fallbackSummary = personEvents[0]?.body ?? `${personName} continuity active.`
    const waiting = personEvents[0]?.waitingOn ? `Waiting on ${personEvents[0]?.waitingOn}. ` : ''
    const blocked = personEvents[0]?.blockedBy ? `Blocked by ${personEvents[0]?.blockedBy}.` : ''

    setSheetTitle(`${personName} Continuity`)
    setSheetRole(personRole ?? 'Operator')
    setSheetSummary(`${waiting}${blocked}`.trim() || fallbackSummary)
    setSheetRhythm(personEvents[0]?.timestamp ? `Last movement ${personEvents[0]?.timestamp}` : 'No recent movement logged')
    setSheetPerson(personName)
    setSheetOpen(true)
    if (!continuityObject && personEvents.length === 0) {
      setSheetSummary(`${personName} continuity is available with fallback payload while source refreshes.`)
    }
  }

  return (
    <main className='relative mx-auto min-h-screen w-full max-w-[430px] bg-[#F7F4EF] pb-32 text-[#111111]'>
      <span className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(200,155,47,0.14),transparent_55%)]' />
      <ShowTelaHeader />
      <section className='px-5 pt-2'><p className='text-[11px] uppercase tracking-[0.16em] text-[#84663A]'>Operational pulse</p><p className='mt-1 text-sm text-[#423A31]'>{changedSinceLastOpen} changes since last open</p><div className='mt-2 space-y-1.5'>{vm.runtimeTimeline.slice(0, 4).map((t) => <div key={t.id} className='rounded-2xl border border-black/10 bg-white/70 px-3 py-2 text-xs'><p className='font-medium text-[#27211A]'>{t.actor} · {t.timestamp}</p><p className='text-[#5E5348]'>{t.summary}</p></div>)}</div></section>
      <ActiveOpsRail onSelect={(person) => openSheet(person.id, person.name, person.role)} people={vm.activeOps.map((i) => ({ id: i.id, name: i.name, role: `${i.latest} • ${i.unresolvedCount ?? 0} unresolved`, unresolvedCount: i.unresolvedCount, updatesCount: 0 }))} />
      <FluencyPartnersRail people={vm.fluencyPartners.map((i) => ({ id: i.id, name: i.name, role: i.latest, unresolvedCount: i.unresolvedCount }))} />
      <CrusadeOperationsRail items={vm.crusadeOperations} />
      <UnresolvedPressureCard pressure={vm.unresolvedPressure} />
      <ContinuityFeed feed={feed} />
      <ContinuitySheet open={sheetOpen} personName={sheetTitle || sheetPerson || 'Operator'} role={sheetRole} summary={sheetSummary} rhythm={sheetRhythm} events={feed.filter((e) => e.owner?.name === sheetPerson)} unresolved={[]} operations={[]} />
      <BottomDock onPearlDrop={handlePearlDrop} />
    </main>
  )
}
