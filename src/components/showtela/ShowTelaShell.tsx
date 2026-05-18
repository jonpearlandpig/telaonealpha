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

export function ShowTelaShell({ vm, onPearlDrop, isDemoMode = false }: { vm: ShowTelaViewModel; onPearlDrop: () => void; isDemoMode?: boolean }) {
  const [feed, setFeed] = useState<ContinuityEvent[]>(vm.feed.map((i) => ({ id: i.id, headline: i.title, body: i.summary, timestamp: i.timestamp, owner: { id: i.owner, name: i.owner }, isNew: i.unresolved, waitingOn: i.waitingOn, blockedBy: i.blockedBy, approvalOwner: i.approvalOwner, lastContactAt: i.lastContactAt, trustLevel: i.trustLevel, operationalRisk: i.operationalRisk, unresolvedDependencies: i.unresolvedDependencies, linkedEntities: i.linkedEntities, linkedThreads: i.linkedThreads, attachments: i.attachments })))
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

  return (
    <main className='relative mx-auto min-h-screen w-full max-w-[430px] bg-[#F7F4EF] pb-32 text-[#111111]'>
      <span className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(200,155,47,0.14),transparent_55%)]' />
      <ShowTelaHeader />
      {isDemoMode ? <section className='mx-5 mt-3 rounded-2xl border border-amber-500/40 bg-amber-100/80 px-3 py-2 text-[11px] font-semibold tracking-[0.08em] text-amber-900'>DEMO MODE — LIVE CST MEMORY NOT CONNECTED</section> : null}
      <section className='px-5 pt-2'><p className='text-[11px] uppercase tracking-[0.16em] text-[#84663A]'>Operational pulse</p><p className='mt-1 text-sm text-[#423A31]'>{changedSinceLastOpen} changes since last open</p><div className='mt-2 space-y-1.5'>{vm.runtimeTimeline.slice(0, 4).map((t) => <div key={t.id} className='rounded-2xl border border-black/10 bg-white/70 px-3 py-2 text-xs'><p className='font-medium text-[#27211A]'>{t.actor} · {t.timestamp}</p><p className='text-[#5E5348]'>{t.summary}</p></div>)}</div></section>
      <div onClick={() => setSheetPerson(vm.activeOps[0]?.name ?? 'Operator')}><ActiveOpsRail people={vm.activeOps.map((i) => ({ id: i.id, name: i.name, role: `${i.latest} • ${i.unresolvedCount ?? 0} unresolved`, unresolvedCount: i.unresolvedCount, updatesCount: 0 }))} /></div>
      <FluencyPartnersRail people={vm.fluencyPartners.map((i) => ({ id: i.id, name: i.name, role: i.latest, unresolvedCount: i.unresolvedCount }))} />
      <CrusadeOperationsRail items={vm.crusadeOperations} />
      <UnresolvedPressureCard pressure={vm.unresolvedPressure} />
      <ContinuityFeed feed={feed} />
      {sheetPerson ? <div className='px-5 pb-4'><ContinuitySheet personName={sheetPerson} events={feed.filter((e) => e.owner?.name === sheetPerson)} unresolved={[]} operations={[]} /></div> : null}
      <BottomDock onPearlDrop={handlePearlDrop} />
    </main>
  )
}
