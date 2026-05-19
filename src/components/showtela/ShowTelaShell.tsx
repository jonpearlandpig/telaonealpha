'use client'
import { useState } from 'react'
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
import { PearlDropVoice } from './PearlDropVoice'
import type { ShowTelaViewModel } from './types'
import type { ContinuityEvent } from '@/lib/showtela/types'

type Tab = 'home' | 'play' | 'messages' | 'search' | 'profile'
type Sheet = { type: 'person'; name: string; role?: string } | { type: 'feed'; item: ContinuityEvent } | { type: 'operation'; name: string } | { type: 'unresolved' } | null

export function ShowTelaShell({ vm, onPearlDrop, user }: { vm: ShowTelaViewModel; onPearlDrop: () => void; user?: { name: string; email: string; image: string } }) {
  const [tab, setTab] = useState<Tab>('home')
  const [showVoice, setShowVoice] = useState(false)
  const [taggedPerson, setTaggedPerson] = useState<string | undefined>(undefined)
  const [feed] = useState<ContinuityEvent[]>(vm.feed.map((i) => ({ id: i.id, headline: i.title, body: i.summary, timestamp: i.timestamp, image: i.image, tags: i.linkedEntities ?? [], owner: { id: i.owner, name: i.owner }, isNew: i.unresolved, pressure: i.unresolved ? ('high' as const) : ('low' as const) })))
  const [sheet, setSheet] = useState<Sheet>(null)
  const unresolvedItems = vm.unresolved ?? []
  const openVoice = (person?: string) => { setTaggedPerson(person); setShowVoice(true) }

  return (
    <main style={{ backgroundColor: '#F8F6F2', color: '#141210' }} className="relative mx-auto min-h-screen w-full max-w-sm pb-36">
      {tab === 'home' && (
        <>
          <ShowTelaHeader userName={user?.name} userImage={user?.image} />
          <ActiveOpsRail items={vm.activeOps.map((i) => ({ id: i.id, name: i.name, latest: i.latest, unresolvedCount: i.unresolvedCount ?? 0, image: i.image, updatesCount: 0 }))} onPersonTap={(name, role) => setSheet({ type: 'person', name, role })} onPearlDrop={(name) => openVoice(name)} />
          <FluencyPartnersRail items={vm.fluencyPartners.map((i) => ({ id: i.id, name: i.name, label: i.name, unresolvedCount: i.unresolvedCount ?? 0, image: i.image, latest: i.latest }))} onPersonTap={(name, role) => setSheet({ type: 'person', name, role })} />
          <CrusadeOperationsRail items={vm.crusadeOperations} onOperationTap={(name) => setSheet({ type: 'operation', name })} />
          <UnresolvedPressureCard pressure={vm.unresolvedPressure} onOpen={() => setSheet({ type: 'unresolved' })} />
          <ContinuityFeed feed={feed} onFeedTap={(item) => setSheet({ type: 'feed', item })} />
        </>
      )}
      {tab === 'play' && (
        <div className="px-5 pt-14">
          <h1 className="text-2xl font-semibold text-stone-900">Show Brief</h1>
          <p className="mt-1 text-sm text-stone-500">As of right now</p>
          <div className="mt-6 flex flex-col gap-3">
            {feed.slice(0, 8).map((item) => (
              <button key={item.id} onClick={() => setSheet({ type: 'feed', item })} className="w-full rounded-2xl bg-white px-4 py-3 text-left shadow-sm">
                <p className="text-xs font-medium text-yellow-700">{item.owner?.name}</p>
                <p className="mt-0.5 text-sm font-semibold text-stone-900">{item.headline}</p>
                {item.body && <p className="mt-0.5 text-xs text-stone-500">{item.body}</p>}
              </button>
            ))}
          </div>
        </div>
      )}
      {tab === 'messages' && (
        <div className="px-5 pt-14">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-stone-900">TELA Talk</h1>
            <button onClick={() => openVoice()} className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-600">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="9" y="2" width="6" height="12" rx="3" fill="white"/><path d="M5 10a7 7 0 0014 0" stroke="white" strokeWidth="2" strokeLinecap="round"/><path d="M12 19v3" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          </div>
          <div className="divide-y divide-stone-100">
            {vm.activeOps.map((p) => (
              <button key={p.id} onClick={() => setSheet({ type: 'person', name: p.name, role: p.latest })} className="flex w-full items-center gap-3 py-3 text-left">
                <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full border-2 border-yellow-500 bg-stone-800">
                  {p.image ? <img src={p.image} alt={p.name} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-base font-semibold text-yellow-200">{p.name.slice(0,1)}</div>}
                  <button onClick={(e) => { e.stopPropagation(); openVoice(p.name) }} className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-stone-900">
                    <span className="text-xs font-bold text-white">+</span>
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-stone-900">{p.name}</p>
                  <p className="truncate text-xs text-stone-500">{p.latest}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
      {tab === 'search' && (
        <div className="px-5 pt-14">
          <h1 className="text-2xl font-semibold text-stone-900">Artifacts</h1>
          <div className="mt-4 flex flex-col gap-2">
            {['CST Call Sheet', 'ShowTELA Feed', 'Decision Log', 'Risk Register'].map((doc) => (
              <div key={doc} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm">
                <span className="text-xl">📄</span>
                <p className="text-sm font-medium text-stone-900">{doc}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {tab === 'profile' && (
        <div className="px-5 pt-14">
          <div className="flex flex-col items-center py-8">
            <div className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-yellow-500 bg-stone-800">
              {user?.image ? <img src={user.image} alt={user.name} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-yellow-200">{user?.name?.slice(0,1) ?? 'J'}</div>}
              <button onClick={() => openVoice(user?.name)} className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-stone-900">
                <span className="text-base font-bold text-white">+</span>
              </button>
            </div>
            <h2 className="mt-3 text-xl font-semibold text-stone-900">{user?.name ?? 'Jon Hartman'}</h2>
            <p className="text-sm text-stone-500">{user?.email}</p>
          </div>
          <a href="/api/auth/signout" className="flex items-center justify-between rounded-2xl bg-white px-4 py-3.5 shadow-sm">
            <p className="text-sm font-medium text-red-500">Sign Out</p>
          </a>
        </div>
      )}
      <BottomDock activeTab={tab} onTabChange={setTab} userImage={user?.image} userName={user?.name} onPearlDrop={() => openVoice()} />
      {showVoice && <PearlDropVoice onClose={() => { setShowVoice(false); setTaggedPerson(undefined) }} />}
      <PersonSheet open={sheet?.type === 'person'} name={sheet?.type === 'person' ? sheet.name : ''} role={sheet?.type === 'person' ? sheet.role : undefined} onClose={() => setSheet(null)} />
      <FeedSheet open={sheet?.type === 'feed'} item={sheet?.type === 'feed' ? sheet.item : null} onClose={() => setSheet(null)} />
      <OperationSheet open={sheet?.type === 'operation'} name={sheet?.type === 'operation' ? sheet.name : ''} onClose={() => setSheet(null)} />
      <UnresolvedSheet open={sheet?.type === 'unresolved'} items={unresolvedItems} onClose={() => setSheet(null)} />
    </main>
  )
}
