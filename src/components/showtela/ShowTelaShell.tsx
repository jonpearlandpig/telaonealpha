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
import { TelaTalk } from './TelaTalk'
import type { ShowTelaViewModel } from './types'
import type { ContinuityEvent } from '@/lib/showtela/types'

type Tab = 'home' | 'play' | 'messages' | 'calendar' | 'profile'
type Sheet = { type: 'person'; name: string; role?: string } | { type: 'feed'; item: ContinuityEvent } | { type: 'operation'; name: string } | { type: 'unresolved' } | null

export function ShowTelaShell({ vm, onPearlDrop, user }: { vm: ShowTelaViewModel; onPearlDrop: () => void; user?: { name: string; email: string; image: string } }) {
  const [tab, setTab] = useState<Tab>('home')
  const [showVoice, setShowVoice] = useState(false)
  const [taggedPerson, setTaggedPerson] = useState<string | undefined>(undefined)
  const feed: ContinuityEvent[] = vm.feed.map((i) => ({ id: i.id, headline: i.title, body: i.summary, timestamp: i.timestamp, image: i.image, tags: i.linkedEntities ?? [], owner: { id: i.owner, name: i.owner }, isNew: i.unresolved, pressure: i.unresolved ? ('high' as const) : ('low' as const) }))
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
                {item.body && <p className="mt-0.5 text-xs text-stone-500 line-clamp-1">{item.body}</p>}
              </button>
            ))}
          </div>
        </div>
      )}
      {tab === 'messages' && (
        <TelaTalk
          activeOps={vm.activeOps}
          fluencyPartners={vm.fluencyPartners}
          onPersonTap={(name, role) => setSheet({ type: 'person', name, role })}
          onVoiceTap={(name) => openVoice(name)}
        />
      )}
      {tab === 'calendar' && (
        <div style={{ backgroundColor: '#F8F6F2', minHeight: '100vh' }}>
          <div className="px-5 pt-14 pb-4 border-b border-[#EAE4DA]">
            <h1 className="text-xl font-semibold text-[#141210]">Operational Calendar</h1>
            <p className="mt-0.5 text-[12px] text-[#8B847B]">Forward continuity view</p>
          </div>
          <div className="px-5 pt-6 flex flex-col gap-3">
            {feed.filter(i => i.timestamp).slice(0, 10).map((item) => {
              const d = item.timestamp ? new Date(item.timestamp) : null
              const dateStr = d ? d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : ''
              const pulseColor = item.pressure === 'high' ? '#F87171' : item.pressure === 'medium' ? '#F59E0B' : '#4ADE80'
              return (
                <button key={item.id} onClick={() => setSheet({ type: 'feed', item })} className="flex items-start gap-3 w-full text-left rounded-2xl bg-white px-4 py-3 shadow-sm">
                  <div className="flex-shrink-0 mt-0.5">
                    <span className="h-2 w-2 rounded-full block" style={{ backgroundColor: pulseColor }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium text-[#A89880] mb-0.5">{dateStr}</p>
                    <p className="text-[13px] font-semibold text-[#141210] line-clamp-1">{item.headline}</p>
                    <p className="text-[11px] text-[#8B847B] mt-0.5">{item.owner?.name}</p>
                  </div>
                </button>
              )
            })}
            {feed.length === 0 && (
              <div className="pt-12 text-center">
                <p className="text-[13px] text-[#8B847B]">No continuity events yet.</p>
                <p className="text-[11px] text-[#A89880] mt-1">Events will appear as operations update.</p>
              </div>
            )}
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
      {showVoice && <PearlDropVoice taggedPerson={taggedPerson} submittedBy={user?.name} onClose={() => { setShowVoice(false); setTaggedPerson(undefined) }} />}
      <PersonSheet open={sheet?.type === 'person'} name={sheet?.type === 'person' ? sheet.name : ''} role={sheet?.type === 'person' ? sheet.role : undefined} onClose={() => setSheet(null)} />
      <FeedSheet open={sheet?.type === 'feed'} item={sheet?.type === 'feed' ? sheet.item : null} onClose={() => setSheet(null)} />
      <OperationSheet open={sheet?.type === 'operation'} name={sheet?.type === 'operation' ? sheet.name : ''} onClose={() => setSheet(null)} />
      <UnresolvedSheet open={sheet?.type === 'unresolved'} items={unresolvedItems} onClose={() => setSheet(null)} />
    </main>
  )
}
