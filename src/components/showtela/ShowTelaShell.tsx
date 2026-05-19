'use client'
import { useEffect, useState } from 'react'
import { ActiveOpsRail } from './ActiveOpsRail'
import { BottomDock } from './BottomDock'
import { ContinuityFeed } from './ContinuityFeed'
import { CrusadeOperationsRail } from './CrusadeOperationsRail'
import { FluencyPartnersRail } from './FluencyPartnersRail'
import { ShowTelaHeader } from './ShowTelaHeader'
import { UnresolvedPressureCard } from './UnresolvedPressureCard'
import { PersonSheet } from './sheets/PersonSheet'
import { FeedSheet } from './sheets/FeedSheet'
import { OperationSheet } from './sheets/OperationSheet'
import { UnresolvedSheet } from './sheets/UnresolvedSheet'
import type { ShowTelaViewModel } from './types'
import type { ContinuityEvent } from '@/lib/showtela/types'

type Sheet =
  | { type: 'person'; name: string; role?: string }
  | { type: 'feed'; item: ContinuityEvent }
  | { type: 'operation'; name: string }
  | { type: 'unresolved' }
  | null

export function ShowTelaShell({ vm, onPearlDrop }: { vm: ShowTelaViewModel; onPearlDrop: () => void }) {
  const [feed, setFeed] = useState<ContinuityEvent[]>(
    vm.feed.map((i) => ({
      id: i.id, headline: i.title, body: i.summary,
      timestamp: i.timestamp, image: i.image, tags: i.linkedEntities ?? [],
      owner: { id: i.owner, name: i.owner }, isNew: i.unresolved,
      pressure: i.unresolved ? ('high' as const) : ('low' as const),
    }))
  )
  const [sheet, setSheet] = useState<Sheet>(null)

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

  const unresolvedItems = vm.feed
    .filter((i) => i.unresolved)
    .map((i) => ({ id: i.id, title: i.title, severity: 'medium' as const }))

  return (
    <main className="relative mx-auto min-h-screen w-full max-w-[430px] bg-[#F8F6F2] pb-36 text-[#141210]">
      <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-5%,rgba(200,155,47,0.10),transparent_50%)]" />

      <ShowTelaHeader />

      <ActiveOpsRail
        items={vm.activeOps.map((i) => ({ id: i.id, name: i.name, latest: i.latest, unresolvedCount: i.unresolvedCount ?? 0, image: i.image, updatesCount: 0 }))}
        onPersonTap={(name, role) => setSheet({ type: 'person', name, role })}
      />

      <FluencyPartnersRail
        items={vm.fluencyPartners.map((i) => ({ id: i.id, name: i.name, label: i.name, unresolvedCount: i.unresolvedCount ?? 0, image: i.image }))}
        onPersonTap={(name, role) => setSheet({ type: 'person', name, role })}
      />

      <CrusadeOperationsRail
        items={vm.crusadeOperations}
        onOperationTap={(name) => setSheet({ type: 'operation', name })}
      />

      <UnresolvedPressureCard
        pressure={vm.unresolvedPressure}
        onOpen={() => setSheet({ type: 'unresolved' })}
      />

      <ContinuityFeed
        feed={feed}
        onFeedTap={(item) => setSheet({ type: 'feed', item })}
      />

      <BottomDock onPearlDrop={handlePearlDrop} />

      {/* Sheets */}
      <PersonSheet
        open={sheet?.type === 'person'}
        name={sheet?.type === 'person' ? sheet.name : ''}
        role={sheet?.type === 'person' ? sheet.role : undefined}
        onClose={() => setSheet(null)}
      />
      <FeedSheet
        open={sheet?.type === 'feed'}
        item={sheet?.type === 'feed' ? sheet.item : null}
        onClose={() => setSheet(null)}
      />
      <OperationSheet
        open={sheet?.type === 'operation'}
        name={sheet?.type === 'operation' ? sheet.name : ''}
        onClose={() => setSheet(null)}
      />
      <UnresolvedSheet
        open={sheet?.type === 'unresolved'}
        items={unresolvedItems}
        onClose={() => setSheet(null)}
      />
    </main>
  )
}
