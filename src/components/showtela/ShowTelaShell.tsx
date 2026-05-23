'use client'
import { useState } from 'react'
import { ContinuityIngest } from '@/components/runtime/continuity-ingest'
import { normalizeContinuityIngestion, type ContinuityIngestionMode } from '@/lib/continuity/normalize-ingestion'
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

function getInitialSurfaceState(): {
  tab: Tab
  showIngest: boolean
  ingestMode: ContinuityIngestionMode | null
} {
  if (typeof window === 'undefined') {
    return { tab: 'home', showIngest: false, ingestMode: null }
  }

  const params = new URLSearchParams(window.location.search)
  const surface = params.get('surface')
  const ingest = params.get('ingest') as ContinuityIngestionMode | null

  const tabMap: Record<string, Tab> = {
    home: 'home',
    crusade: 'play',
    tela: 'messages',
    history: 'calendar',
    profile: 'profile',
  }

  const validIngestModes: ContinuityIngestionMode[] = ['voice-note', 'quick-update', 'upload-files', 'paste-notes', 'add-photos', 'add-link']
  const ingestMode = ingest && validIngestModes.includes(ingest) ? ingest : null

  return {
    tab: surface && tabMap[surface] ? tabMap[surface] : 'home',
    showIngest: Boolean(ingestMode),
    ingestMode,
  }
}

function formatTimelineTime(iso?: string) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace(' AM', 'A').replace(' PM', 'P')
  } catch {
    return ''
  }
}

export function ShowTelaShell({ vm, user }: { vm: ShowTelaViewModel; user?: { name: string; email: string; image: string } }) {
  const initialSurface = getInitialSurfaceState()
  const [tab, setTab] = useState<Tab>(initialSurface.tab)
  const [showVoice, setShowVoice] = useState(false)
  const [showIngest, setShowIngest] = useState(initialSurface.showIngest)
  const [ingestMode, setIngestMode] = useState<ContinuityIngestionMode | null>(initialSurface.ingestMode)
  const [taggedPerson, setTaggedPerson] = useState<string | undefined>(undefined)
  const [feed, setFeed] = useState<ContinuityEvent[]>(
    vm.feed.map((item) => ({
      id: item.id,
      headline: item.title,
      body: item.summary,
      timestamp: item.timestamp,
      image: item.image,
      tags: item.linkedEntities ?? [],
      owner: { id: item.owner, name: item.owner },
      isNew: item.unresolved,
      pressure: (item.pressure as 'low' | 'medium' | 'high' | undefined) ?? (item.unresolved ? 'high' : 'low'),
    })),
  )
  const [sheet, setSheet] = useState<Sheet>(null)
  const unresolvedItems = vm.unresolved ?? []
  const openVoice = (person?: string) => { setTaggedPerson(person); setShowVoice(true) }
  const openIngest = (mode?: ContinuityIngestionMode | null) => { setIngestMode(mode ?? null); setShowIngest(true) }
  const latestTimeline = vm.runtimeTimeline?.[0]
  const priorityOperation = [...vm.crusadeOperations].sort((a, b) => (b.unresolvedCount ?? 0) - (a.unresolvedCount ?? 0))[0]
  const recentFeedItem = feed[0]
  const activeOperators = vm.activeOps.map((item) => item.name)
  const userFirstName = user?.name?.split(' ')[0]?.toLowerCase()
  const visibleActiveOps = vm.activeOps.filter((item) => {
    if (!userFirstName) return true
    return item.name.toLowerCase() !== userFirstName && !item.name.toLowerCase().includes(userFirstName)
  })

  const autoscan = {
    currentTruth: priorityOperation
      ? `${priorityOperation.label} currently carries the highest unresolved operational pressure.`
      : 'Operational pressure is evenly distributed across the field.',
    mattersNow: latestTimeline
      ? `${latestTimeline.summary} stabilized most recently${latestTimeline.timestamp ? ` at ${formatTimelineTime(latestTimeline.timestamp)}` : ''}${latestTimeline.actor ? ` through ${latestTimeline.actor}` : ''}.`
      : 'No new continuity drift surfaced in the latest autoscan.',
    nextMovement: priorityOperation?.latest
      ? `Next meaningful movement is ${priorityOperation.latest.toLowerCase()}.`
      : 'Next meaningful movement is confirming the highest-pressure thread.',
    suggestedActions: [
      {
        id: 'pressure',
        label: priorityOperation ? `Open ${priorityOperation.label}` : 'Review unresolved pressure',
        detail: priorityOperation
          ? `${priorityOperation.unresolvedCount ?? 0} unresolved item${priorityOperation.unresolvedCount === 1 ? '' : 's'} remain in scope there right now.`
          : 'Check the field for fresh blockers or newly surfaced pressure.',
      },
      {
        id: 'continuity',
        label: 'Inspect latest continuity change',
        detail: recentFeedItem
          ? `${recentFeedItem.headline}${recentFeedItem.owner?.name ? ` from ${recentFeedItem.owner.name}` : ''}.`
          : 'No staged continuity changes are currently ahead of the feed.',
      },
      {
        id: 'operator',
        label: activeOperators[0] ? `Pulse ${activeOperators[0]}` : 'Pulse active operators',
        detail: activeOperators[0]
          ? `${activeOperators[0]} is the fastest path to clarifying current field movement.`
          : 'Use a quick continuity update to re-anchor operator movement.',
      },
    ],
    latestChange: recentFeedItem ? `${recentFeedItem.headline}${recentFeedItem.body ? ` — ${recentFeedItem.body}` : ''}` : undefined,
    activeOperators: activeOperators.slice(0, 6),
  }

  return (
    <main style={{ backgroundColor: '#F8F6F2', color: '#141210' }} className="relative mx-auto min-h-screen w-full max-w-sm pb-36">
      {tab === 'home' && (
        <>
          <ShowTelaHeader
            userName={user?.name}
            unresolvedCount={vm.unresolvedPressure.unresolvedCount}
            autoscan={autoscan}
          />
          <ActiveOpsRail
            userName={user?.name}
            userImage={user?.image}
            items={visibleActiveOps.map((item) => ({ id: item.id, name: item.name, latest: item.latest, unresolvedCount: item.unresolvedCount ?? 0, image: item.image, updatesCount: 0 }))}
            onProfileTap={() => setTab('profile')}
            onTelaTap={() => setTab('messages')}
            onPersonTap={(name, role) => setSheet({ type: 'person', name, role })}
            onAddContinuity={() => openIngest(null)}
          />
          <FluencyPartnersRail items={vm.fluencyPartners.map((item) => ({ id: item.id, name: item.name, label: item.name, unresolvedCount: item.unresolvedCount ?? 0, image: item.image, latest: item.latest }))} onPersonTap={(name, role) => setSheet({ type: 'person', name, role })} />
          <CrusadeOperationsRail items={vm.crusadeOperations} unresolvedItems={vm.unresolved} onOperationTap={(name) => setSheet({ type: 'operation', name })} />
          <UnresolvedPressureCard pressure={vm.unresolvedPressure} onOpen={() => setSheet({ type: 'unresolved' })} />
          <ContinuityFeed feed={feed} onFeedTap={(item) => setSheet({ type: 'feed', item })} />
        </>
      )}

      {tab === 'play' && (
        <div className="px-5 pt-14">
          <h1 className="text-2xl font-semibold text-stone-900">Crusade Brief</h1>
          <p className="mt-1 text-sm text-stone-500">Current movement across the field</p>
          <div className="mt-6 flex flex-col gap-3">
            {feed.slice(0, 8).map((item) => (
              <button key={item.id} onClick={() => setSheet({ type: 'feed', item })} className="w-full rounded-2xl bg-white px-4 py-3 text-left shadow-sm">
                <p className="text-xs font-medium text-yellow-700">{item.owner?.name}</p>
                <p className="mt-0.5 text-sm font-semibold text-stone-900">{item.headline}</p>
                {item.body && <p className="mt-0.5 line-clamp-1 text-xs text-stone-500">{item.body}</p>}
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === 'messages' && <TelaTalk autoscan={autoscan} />}

      {tab === 'calendar' && (
        <div style={{ backgroundColor: '#F8F6F2', minHeight: '100vh' }}>
          <div className="border-b border-[#EAE4DA] px-5 pb-4 pt-14">
            <h1 className="text-xl font-semibold text-[#141210]">Operational Calendar</h1>
            <p className="mt-0.5 text-[12px] text-[#8B847B]">Forward continuity view</p>
          </div>
          <div className="flex flex-col gap-3 px-5 pt-6">
            {feed.filter((item) => item.timestamp).slice(0, 10).map((item) => {
              const date = item.timestamp ? new Date(item.timestamp) : null
              const dateStr = date ? date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : ''
              const pulseColor = item.pressure === 'high' ? '#F87171' : item.pressure === 'medium' ? '#F59E0B' : '#4ADE80'
              return (
                <button key={item.id} onClick={() => setSheet({ type: 'feed', item })} className="flex w-full items-start gap-3 rounded-2xl bg-white px-4 py-3 text-left shadow-sm">
                  <div className="mt-0.5 flex-shrink-0">
                    <span className="block h-2 w-2 rounded-full" style={{ backgroundColor: pulseColor }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="mb-0.5 text-[10px] font-medium text-[#A89880]">{dateStr}</p>
                    <p className="line-clamp-1 text-[13px] font-semibold text-[#141210]">{item.headline}</p>
                    <p className="mt-0.5 text-[11px] text-[#8B847B]">{item.owner?.name}</p>
                  </div>
                </button>
              )
            })}
            {feed.length === 0 && (
              <div className="pt-12 text-center">
                <p className="text-[13px] text-[#8B847B]">No continuity events yet.</p>
                <p className="mt-1 text-[11px] text-[#A89880]">Events will appear as operations update.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'profile' && (
        <div className="px-5 pt-14">
          <div className="rounded-[28px] border border-[#E2D7C7] bg-[linear-gradient(180deg,#FFFFFF_0%,#F3EDE3_100%)] px-5 py-6 shadow-[0_12px_30px_rgba(17,17,17,0.06)]">
            <div className="flex flex-col items-center">
              <div className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-[#CFB889] bg-stone-800">
                {user?.image ? <img src={user.image} alt={user.name} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-yellow-200">{user?.name?.slice(0, 1) ?? 'S'}</div>}
                <button onClick={() => openVoice(user?.name)} className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-stone-900">
                  <span className="text-base font-bold text-white">+</span>
                </button>
              </div>
              <h2 className="mt-3 text-xl font-semibold text-stone-900">{user?.name ?? 'Jon Hartman'}</h2>
              <p className="text-sm text-stone-500">Personal continuity anchor</p>
              <p className="mt-2 text-center text-[13px] leading-relaxed text-[#6B5D4B]">Use this surface to contribute notes, voice, artifacts, and personal operational memory without dropping into settings or governance overhead.</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button onClick={() => openVoice(user?.name)} className="rounded-[22px] bg-[#171411] px-4 py-4 text-left text-[#F6EFDF] shadow-[0_12px_24px_rgba(17,17,17,0.14)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#D7BC7F]">Voice</p>
              <p className="mt-2 text-[15px] font-semibold">Voice Ingestion</p>
              <p className="mt-1 text-[12px] leading-relaxed text-[#DDD1BB]">Capture spoken continuity and keep your thread intact.</p>
            </button>
            <button onClick={() => openIngest('quick-update')} className="rounded-[22px] bg-white px-4 py-4 text-left shadow-[0_12px_24px_rgba(17,17,17,0.06)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9A7C46]">Update</p>
              <p className="mt-2 text-[15px] font-semibold text-[#171411]">Quick Contribution</p>
              <p className="mt-1 text-[12px] leading-relaxed text-[#6B5D4B]">Log notes, blockers, and movement from your side of the field.</p>
            </button>
            <button onClick={() => openIngest('upload-files')} className="rounded-[22px] bg-white px-4 py-4 text-left shadow-[0_12px_24px_rgba(17,17,17,0.06)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9A7C46]">Artifacts</p>
              <p className="mt-2 text-[15px] font-semibold text-[#171411]">Uploads</p>
              <p className="mt-1 text-[12px] leading-relaxed text-[#6B5D4B]">Stage files and photos as traced continuity objects.</p>
            </button>
            <button onClick={() => setTab('calendar')} className="rounded-[22px] bg-white px-4 py-4 text-left shadow-[0_12px_24px_rgba(17,17,17,0.06)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9A7C46]">History</p>
              <p className="mt-2 text-[15px] font-semibold text-[#171411]">Continuity Calendar</p>
              <p className="mt-1 text-[12px] leading-relaxed text-[#6B5D4B]">Review recent continuity objects and linked operational movement in time order.</p>
            </button>
          </div>
          <a href="/api/auth/signout" className="mt-4 flex items-center justify-between rounded-2xl bg-white px-4 py-3.5 shadow-sm">
            <p className="text-sm font-medium text-red-500">Sign Out</p>
          </a>
        </div>
      )}

      <BottomDock activeTab={tab} onTabChange={setTab} userImage={user?.image} userName={user?.name} />
      {showVoice && <PearlDropVoice taggedPerson={taggedPerson} submittedBy={user?.name} onClose={() => { setShowVoice(false); setTaggedPerson(undefined) }} />}
      {showIngest && (
        <ContinuityIngest
          open={showIngest}
          ownerName={user?.name}
          people={vm.activeOps.map((item) => ({ id: item.id, label: item.name }))}
          operations={vm.crusadeOperations.map((item) => ({ id: item.id, label: item.label }))}
          initialMode={ingestMode}
          onClose={() => { setShowIngest(false); setIngestMode(null) }}
          onVoiceNote={() => openVoice(user?.name)}
          onSubmit={(input) => setFeed((current) => [normalizeContinuityIngestion(input), ...current])}
        />
      )}
      <PersonSheet open={sheet?.type === 'person'} name={sheet?.type === 'person' ? sheet.name : ''} role={sheet?.type === 'person' ? sheet.role : undefined} onClose={() => setSheet(null)} />
      <FeedSheet open={sheet?.type === 'feed'} item={sheet?.type === 'feed' ? sheet.item : null} onClose={() => setSheet(null)} />
      <OperationSheet open={sheet?.type === 'operation'} name={sheet?.type === 'operation' ? sheet.name : ''} onClose={() => setSheet(null)} />
      <UnresolvedSheet open={sheet?.type === 'unresolved'} items={unresolvedItems} onClose={() => setSheet(null)} />
    </main>
  )
}
