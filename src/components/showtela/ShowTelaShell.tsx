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

type Tab = 'home' | 'play' | 'messages' | 'search' | 'profile'
type Sheet =
  | { type: 'person'; name: string; role?: string }
  | { type: 'feed'; item: ContinuityEvent }
  | { type: 'operation'; name: string }
  | { type: 'unresolved' }
  | null

export function ShowTelaShell({ vm, onPearlDrop, user }: { vm: ShowTelaViewModel; onPearlDrop: () => void; user?: { name: string; email: string; image: string } }) {
  const [tab, setTab] = useState<Tab>('home')
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

  const unresolvedItems = vm.unresolved ?? []

  return (
    <main className="relative mx-auto min-h-screen w-full max-w-[430px] bg-[#F8F6F2] pb-36 text-[#141210]">
      <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-5%,rgba(200,155,47,0.10),transparent_50%)]" />

      {tab === 'home' && (
        <>
          <ShowTelaHeader userName={user?.name} userImage={user?.image} />
          <ActiveOpsRail
            items={vm.activeOps.map((i) => ({ id: i.id, name: i.name, latest: i.latest, unresolvedCount: i.unresolvedCount ?? 0, image: i.image, updatesCount: 0 }))}
            onPersonTap={(name, role) => setSheet({ type: 'person', name, role })}
          />
          <FluencyPartnersRail
            items={vm.fluencyPartners.map((i) => ({ id: i.id, name: i.name, label: i.name, unresolvedCount: i.unresolvedCount ?? 0, image: i.image, latest: i.latest }))}
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
        </>
      )}

      {tab === 'play' && (
        <div className="px-5 pt-[58px]">
          <h1 className="text-[26px] font-semibold tracking-[-0.5px] text-[#141210]">Show Brief</h1>
          <p className="mt-1 text-[13px] text-[#8B847B]">As of right now — here&apos;s where Crusade stands.</p>
          <div className="mt-6 flex flex-col gap-3">
            {feed.slice(0, 8).map((item) => (
              <button key={item.id} onClick={() => setSheet({ type: 'feed', item })} className="w-full rounded-[16px] bg-white px-4 py-3 text-left shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
                <p className="text-[11px] font-medium text-[#C89B2F]">{item.owner?.name}</p>
                <p className="mt-0.5 text-[14px] font-semibold text-[#141210]">{item.headline}</p>
                {item.body && <p className="mt-0.5 text-[12px] text-[#5E5348]">{item.body}</p>}
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === 'messages' && (
        <div className="px-5 pt-[58px]">
          <h1 className="text-[26px] font-semibold tracking-[-0.5px] text-[#141210]">TELA Talk</h1>
          <p className="mt-1 text-[13px] text-[#8B847B]">Messages · Threads · Continuity</p>
          <div className="mt-6 flex flex-col gap-0 divide-y divide-[#EAE4DA]">
            {vm.activeOps.map((p) => (
              <button key={p.id} onClick={() => setSheet({ type: 'person', name: p.name, role: p.latest })} className="flex items-center gap-3 py-3 text-left">
                <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-full border-[2px] border-[#C89B2F] bg-[#1A1712]">
                  {p.image ? <img src={p.image} alt={p.name} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-base font-semibold text-[#F8E1B0]">{p.name.slice(0,1)}</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-[#141210]">{p.name}</p>
                  <p className="text-[12px] text-[#8B847B] truncate">{p.latest}</p>
                </div>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="#B8A88A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            ))}
            {vm.fluencyPartners.slice(0, 8).map((p) => (
              <button key={p.id} onClick={() => setSheet({ type: 'person', name: p.name, role: p.latest })} className="flex items-center gap-3 py-3 text-left">
                <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-full border-[2px] border-[#D4C9B4] bg-[#1A1712]">
                  <div className="flex h-full w-full items-center justify-center text-base font-semibold text-[#F8E1B0]">{(p.name || p.latest || '?').slice(0,1)}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-[#141210]">{p.name || p.latest}</p>
                  <p className="text-[12px] text-[#8B847B] truncate">{p.latest}</p>
                </div>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="#B8A88A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === 'search' && (
        <div className="px-5 pt-[58px]">
          <h1 className="text-[26px] font-semibold tracking-[-0.5px] text-[#141210]">Artifacts</h1>
          <p className="mt-1 text-[13px] text-[#8B847B]">Documents · Files · Records</p>
          <div className="mt-4 rounded-[14px] bg-white px-4 py-3 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
            <input placeholder="Search documents, people, operations..." className="w-full bg-transparent text-[14px] text-[#141210] outline-none placeholder:text-[#B8A88A]" />
          </div>
          <div className="mt-4 flex flex-col gap-2">
            {['CST Call Sheet', 'ShowTELA Feed', 'Decision Log', 'Risk Register', 'Touring Assumptions', 'Communication Rhythm'].map((doc) => (
              <div key={doc} className="flex items-center gap-3 rounded-[14px] bg-white px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <span className="text-[20px]">📄</span>
                <p className="text-[14px] font-medium text-[#141210]">{doc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'profile' && (
        <div className="px-5 pt-[58px]">
          <div className="flex flex-col items-center py-8">
            <div className="h-20 w-20 overflow-hidden rounded-full border-[3px] border-[#C89B2F] bg-[#1A1712] shadow-[0_0_0_4px_rgba(200,155,47,0.15)]">
              {user?.image
                ? <img src={user.image} alt={user.name} className="h-full w-full object-cover" />
                : <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-[#F8E1B0]">{user?.name?.slice(0,1) ?? 'J'}</div>
              }
            </div>
            <h2 className="mt-3 text-[20px] font-semibold text-[#141210]">{user?.name ?? 'Jon Hartman'}</h2>
            <p className="text-[13px] text-[#8B847B]">{user?.email ?? 'jonathan@pearlandpig.com'}</p>
            <span className="mt-2 rounded-full bg-[#1A1712] px-3 py-1 text-[10px] font-semibold tracking-widest text-[#C89B2F]">PEARL & PIG</span>
          </div>
          <div className="flex flex-col gap-2">
            {['Notification Settings', 'Data & Privacy', 'Connected Accounts'].map((item) => (
              <button key={item} className="flex items-center justify-between rounded-[14px] bg-white px-4 py-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <p className="text-[14px] font-medium text-[#141210]">{item}</p>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="#B8A88A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            ))}
            <a href="/api/auth/signout" className="flex items-center justify-between rounded-[14px] bg-white px-4 py-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <p className="text-[14px] font-medium text-[#F87171]">Sign Out</p>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="#F87171" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </a>
          </div>
        </div>
      )}

      <BottomDock
        activeTab={tab}
        onTabChange={setTab}
        userImage={user?.image}
        userName={user?.name}
      />

      <PersonSheet open={sheet?.type === 'person'} name={sheet?.type === 'person' ? sheet.name : ''} role={sheet?.type === 'person' ? sheet.role : undefined} onClose={() => setSheet(null)} />
      <FeedSheet open={sheet?.type === 'feed'} item={sheet?.type === 'feed' ? sheet.item : null} onClose={() => setSheet(null)} />
      <OperationSheet open={sheet?.type === 'operation'} name={sheet?.type === 'operation' ? sheet.name : ''} onClose={() => setSheet(null)} />
      <UnresolvedSheet open={sheet?.type === 'unresolved'} items={unresolvedItems} onClose={() => setSheet(null)} />
    </main>
  )
}
