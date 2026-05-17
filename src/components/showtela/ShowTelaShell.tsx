'use client'

import { useEffect, useMemo, useState } from 'react'
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
import type { ActionType } from './FeedActionBar'

export function ShowTelaShell({ vm, onCardAction, onPearlDrop, env, commit, buildTimestamp }: { vm: ShowTelaViewModel; onCardAction: (itemId: string, action: ActionType) => void; onPearlDrop: () => void; env: string; commit: string; buildTimestamp: string }) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetTitle, setSheetTitle] = useState('Continuity')
  const [feed, setFeed] = useState<ContinuityEvent[]>(vm.feed.map((i) => ({ id: i.id, headline: i.title, body: i.summary, timestamp: i.timestamp, owner: { id: i.owner, name: i.owner }, isNew: i.unresolved })))

  const unresolved = useMemo(() => vm.unresolvedPressure.unresolvedCount, [vm.unresolvedPressure.unresolvedCount])
  const isPreview = env === 'preview' || env === 'development'
  const shortCommit = commit.slice(0, 7)
  const time = new Date(buildTimestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace(' AM', 'A').replace(' PM', 'P')
  useEffect(() => {
    console.log('[ShowTELA] Canonical shell active')
  }, [])

  const openSheet = (title: string) => {
    setSheetTitle(title)
    setSheetOpen(true)
  }

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
    <main data-showtela-shell='canonical' className={`relative mx-auto min-h-screen w-full max-w-[430px] bg-[#F7F4EF] pb-32 text-[#111111] ${isPreview ? 'ring-1 ring-[#C89B2F]/40' : ''}`}>
      <div className='fixed right-2 top-2 z-[101] rounded bg-red-700 px-2 py-1 text-xs font-bold text-white'>CANONICAL SHELL ACTIVE</div>
      <span className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(200,155,47,0.14),transparent_55%)]' />
      <ShowTelaHeader />
      <ActiveOpsRail people={vm.activeOps.map((i) => ({ id: i.id, name: i.name, role: i.latest, unresolvedCount: i.unresolvedCount, updatesCount: 0 }))} onSelect={(p) => openSheet(`${p.name} Continuity`)} />
      <FluencyPartnersRail people={vm.fluencyPartners.map((i) => ({ id: i.id, name: i.name, role: i.latest, unresolvedCount: i.unresolvedCount }))} />
      <CrusadeOperationsRail items={vm.crusadeOperations} />
      <div onClick={() => openSheet('Unresolved Layer')}><UnresolvedPressureCard pressure={vm.unresolvedPressure} /></div>
      <div onClick={() => onCardAction('feed', 'acknowledge')}><ContinuityFeed feed={feed} /></div>
      <BottomDock onPearlDrop={handlePearlDrop} />
      {isPreview ? <aside className='fixed bottom-6 left-3 z-[80] rounded-lg bg-black/65 px-2.5 py-1.5 text-[11px] text-[#F7F4EF] backdrop-blur'><span className='mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[#C89B2F]' />PREVIEW • {shortCommit} • {time}</aside> : null}

      <ContinuitySheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={sheetTitle}
        subtitle={`Operational pressure: ${unresolved} unresolved`}
        events={feed.slice(0, 3)}
        unresolved={Array.from({ length: vm.unresolvedPressure.unresolvedCount }, (_, idx) => ({ id: `u-${idx}`, title: 'Continuity dependency' }))}
        operations={vm.crusadeOperations.map((o) => ({ id: o.id, title: o.label }))}
      />
    </main>
  )
}
