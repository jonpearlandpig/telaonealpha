'use client'
import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createShowTelaId } from '@/lib/showtela/showTelaId'
import { ContinuityIngest } from '@/components/runtime/continuity-ingest'
import type { ContinuityIngestionInput, ContinuityIngestionMode } from '@/lib/continuity/normalize-ingestion'
import { buildOperationalCalendarEvents, buildCalendarFromOperationalEvents } from '@/lib/showtela/calendar'
import { calculateOperationalReadiness } from '@/lib/runtime/operational/operationalExtraction'
import { ActiveOpsRail } from './ActiveOpsRail'
import { BottomDock } from './BottomDock'
import { CalendarWeekRail } from './CalendarWeekRail'
import { ContinuityFeed } from './ContinuityFeed'
import { CrusadeOperationsRail } from './CrusadeOperationsRail'
import { OpeningSurface } from './OpeningSurface'
import { OperationalCalendar } from './OperationalCalendar'
import { ShowTelaHeader } from './ShowTelaHeader'
import { UnresolvedPressureCard } from './UnresolvedPressureCard'
import { PersonSheet } from './sheets/PersonSheet'
import { FeedSheet } from './sheets/FeedSheet'
import { OperationSheet } from './sheets/OperationSheet'
import { UnresolvedSheet } from './sheets/UnresolvedSheet'
import { VenueSheet } from './sheets/VenueSheet'
import { VenueCard } from './VenueCard'
import { PearlDropVoice } from './PearlDropVoice'
import { TelaTalk } from './TelaTalk'
import type { ShowTelaViewModel, OperationEntity, UnresolvedItem, UnresolvedPressure, VenueItem } from './types'
import type { DocumentHydration } from '@/lib/continuity/documentIngest'
import type { ContinuityEvent } from '@/lib/showtela/types'
import type { OperationalProjection, OperationalStateRecord } from '@/lib/runtime/state/model'
import type { OperationalBrief } from '@/lib/briefing/types'
import type { FocusEngineResult } from '@/lib/focus/types'
import type { ReplayOutput, ReplayStepState } from '@/lib/replay/types'

type Tab = 'home' | 'play' | 'messages' | 'calendar' | 'profile'
type Sheet = { type: 'person'; name: string; role?: string } | { type: 'feed'; item: ContinuityEvent } | { type: 'operation'; name: string } | { type: 'unresolved' } | { type: 'venue'; venueId: string; venueName: string } | null

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

function derivePressure(unresolvedItems: UnresolvedItem[]): UnresolvedPressure {
  const overdueCount = unresolvedItems.filter((item) => (item.severity ?? '').toLowerCase() === 'high' || (item.aging ?? 0) >= 3).length
  const blockedCount = unresolvedItems.filter((item) => item.blocking).length
  const pendingApprovals = unresolvedItems.filter((item) => !item.blocking && (item.severity ?? '').toLowerCase() === 'medium').length

  return {
    unresolvedCount: unresolvedItems.length,
    overdueCount,
    blockedCount,
    pendingApprovals,
  }
}

function mapVmFeedItem(item: ShowTelaViewModel['feed'][number]): ContinuityEvent {
  return {
    id: item.id,
    headline: item.title,
    body: item.summary,
    timestamp: item.timestamp,
    image: item.image,
    tags: item.linkedEntities ?? [],
    owner: { id: item.owner, name: item.owner },
    isNew: item.unresolved,
    pressure: (item.pressure as 'low' | 'medium' | 'high' | undefined) ?? (item.unresolved ? 'high' : 'low'),
  }
}

function stateTone(state: OperationalStateRecord['severity']) {
  if (state === 'critical') return 'border-[#C89B2F]/30 bg-[#1F1A12] text-[#F6EEDB]'
  if (state === 'high') return 'border-[#D2B47A]/35 bg-[#2A2217] text-[#F6EEDB]'
  if (state === 'medium') return 'border-[#E2D7C7] bg-white text-[#171411]'
  return 'border-[#D7E3D1] bg-[#F2F7EF] text-[#20311F]'
}

function projectionCards(projection?: OperationalProjection) {
  if (!projection) return []
  return [
    ...projection.blockers.slice(0, 2),
    ...projection.movement.slice(0, 1),
    ...projection.readiness.slice(0, 1),
  ]
}

const STATE_LABEL: Record<ReplayStepState, string> = {
  BLOCKER_CREATED: 'Blocker',
  BLOCKER_RESOLVED: 'Resolved',
  PRESSURE_INCREASED: 'Pressure up',
  PRESSURE_DECREASED: 'Pressure down',
  DEPENDENCY_ADDED: 'Dependency',
  DEPENDENCY_CLEARED: 'Cleared',
  FOCUS_EVENT: 'Focus',
  CONTINUITY_RECORDED: 'Recorded',
}

const STATE_COLOR: Record<ReplayStepState, string> = {
  BLOCKER_CREATED: '#C4521E',
  BLOCKER_RESOLVED: '#4A7C59',
  PRESSURE_INCREASED: '#C4521E',
  PRESSURE_DECREASED: '#4A7C59',
  DEPENDENCY_ADDED: '#9A7C46',
  DEPENDENCY_CLEARED: '#4A7C59',
  FOCUS_EVENT: '#9A7C46',
  CONTINUITY_RECORDED: '#A89880',
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

function BriefingCard({ briefing }: { briefing: OperationalBrief }) {
  const pct = briefing.currentReadiness
  const readColor = pct >= 70 ? '#4A7C59' : pct >= 40 ? '#9A7C46' : '#C4521E'
  return (
    <section className="px-5 pb-4">
      <div className="rounded-[22px] border border-[#E2D7C7] bg-white px-5 py-4 shadow-[0_8px_24px_rgba(17,17,17,0.05)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: '#9A7C46' }}>
          Operational Brief
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[#171411]">
          <span><span className="font-semibold">{briefing.newEvents}</span> new</span>
          {briefing.resolvedItems > 0 && (
            <span><span className="font-semibold">{briefing.resolvedItems}</span> resolved</span>
          )}
          {briefing.newBlockers > 0 && (
            <span style={{ color: '#C4521E' }}><span className="font-semibold">{briefing.newBlockers}</span> blockers</span>
          )}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-[#EDE8E0]">
            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: readColor }} />
          </div>
          <p className="shrink-0 text-[12px] font-semibold" style={{ color: readColor }}>
            Readiness {pct}%
          </p>
        </div>
      </div>
    </section>
  )
}

function FocusCard({ focus }: { focus: FocusEngineResult }) {
  const top = focus.topFocus
  if (!top) {
    return (
      <section className="px-5 pb-4">
        <div className="rounded-[22px] border border-[#D7E3D1] bg-[#F2F7EF] px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#4A7C59]">Field Status</p>
          <p className="mt-2 text-[15px] font-semibold text-[#20311F]">Field is calm.</p>
          <p className="mt-1 text-[12px] text-[#4A7C59]">No active blockers detected.</p>
        </div>
      </section>
    )
  }
  return (
    <section className="px-5 pb-4">
      <div
        className="rounded-[22px] px-5 py-4 shadow-[0_12px_24px_rgba(17,17,17,0.14)]"
        style={{ backgroundColor: '#1F1A12', border: '1px solid rgba(200,155,47,0.22)' }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'rgba(200,155,47,0.65)' }}>
          Top Focus
        </p>
        <p className="mt-2 text-[16px] font-semibold leading-snug text-[#F6EFDF]">{top.title}</p>
        <p className="mt-1 text-[12px] text-[#DDD1BB]">{top.owner} · Priority {top.priorityScore}</p>
        {top.recommendedAction && (
          <p className="mt-3 text-[12px] leading-relaxed text-[#D7C9A8]">{top.recommendedAction}</p>
        )}
      </div>
    </section>
  )
}

function ReplayCard({ replay }: { replay: ReplayOutput }) {
  if (replay.timeline.length === 0) return null
  const recent = [...replay.timeline].reverse().slice(0, 5)
  return (
    <section className="px-5 pb-5">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9A7C46]">
        Recent Activity
      </p>
      <div className="divide-y divide-[#F0EAE0] overflow-hidden rounded-[22px] border border-[#E2D7C7] bg-white">
        {recent.map((step) => (
          <div key={step.id} className="flex items-start gap-3 px-4 py-3">
            <p className="w-[52px] shrink-0 text-[11px] text-[#A89880]">
              {formatRelativeTime(step.timestamp)}
            </p>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 text-[13px] font-medium leading-snug text-[#171411]">
                {step.headline}
              </p>
              <p
                className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]"
                style={{ color: STATE_COLOR[step.resultingState] }}
              >
                {STATE_LABEL[step.resultingState]}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function DepartmentsRail({ departments }: { departments: OperationEntity[] }) {
  if (!departments.length) return null
  return (
    <section className="px-5 pb-5">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9A7C46]">
        Departments
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {departments.map((dept) => (
          <div
            key={dept.id}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-[#DED4C4] bg-white px-3 py-1.5"
          >
            <span className="text-[12px] font-semibold text-[#171411]">{dept.name}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function VenueIntelligenceRail({
  venues,
  onTapVenue,
}: {
  venues: VenueItem[]
  onTapVenue: (venueId: string) => void
}) {
  if (!venues.length) return null
  return (
    <section className="px-5 pb-5">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9A7C46]">
        Venue Intelligence
      </p>
      <div className="flex flex-col gap-3">
        {venues.map((venue) => (
          <VenueCard key={venue.id} venue={venue} onTap={onTapVenue} />
        ))}
      </div>
    </section>
  )
}

function TELAwhyCard({
  crewCount,
  departmentCount,
  calendarCount,
  readiness,
  lastFeedItem,
}: {
  crewCount: number
  departmentCount: number
  calendarCount: number
  readiness: number
  lastFeedItem?: { timestamp: string; owner: string }
}) {
  if (!crewCount && !departmentCount && !calendarCount) return null
  return (
    <section className="px-5 pb-5">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9A7C46]">
        Runtime Evidence
      </p>
      <div className="divide-y divide-[#F0EAE0] overflow-hidden rounded-[22px] border border-[#E2D7C7] bg-white">
        {crewCount > 0 && (
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-[13px] text-[#171411]">Crew members</p>
            <p className="text-[13px] font-semibold text-[#9A7C46]">{crewCount}</p>
          </div>
        )}
        {departmentCount > 0 && (
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-[13px] text-[#171411]">Departments</p>
            <p className="text-[13px] font-semibold text-[#9A7C46]">{departmentCount}</p>
          </div>
        )}
        {calendarCount > 0 && (
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-[13px] text-[#171411]">Show dates</p>
            <p className="text-[13px] font-semibold text-[#9A7C46]">{calendarCount}</p>
          </div>
        )}
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-[13px] text-[#171411]">Readiness</p>
          <p className="text-[13px] font-semibold" style={{ color: readiness >= 70 ? '#4A7C59' : readiness >= 40 ? '#9A7C46' : '#C4521E' }}>
            {readiness}%
          </p>
        </div>
        {lastFeedItem && (
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-[13px] text-[#171411]">Last update</p>
            <p className="text-[12px] text-[#A89880]">
              {formatRelativeTime(lastFeedItem.timestamp)}{lastFeedItem.owner ? ` · ${lastFeedItem.owner}` : ''}
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

function HydrationSummaryBanner({ hydration, onDismiss }: { hydration: DocumentHydration; onDismiss: () => void }) {
  const lines: string[] = []
  if (hydration.personsActivated > 0) lines.push(`${hydration.personsActivated} crew activated`)
  if (hydration.departmentsActivated > 0) lines.push(`${hydration.departmentsActivated} departments`)
  if (hydration.showDatesImported > 0) lines.push(`${hydration.showDatesImported} shows imported`)
  if (hydration.venueCreated) lines.push('venue added')
  if (!lines.length) lines.push('Document ingested')

  return (
    <div
      className="fixed bottom-28 left-0 right-0 z-[85] mx-auto max-w-[430px] px-5 md:max-w-[680px] xl:max-w-[760px]"
    >
      <button
        onClick={onDismiss}
        className="w-full rounded-[22px] px-5 py-4 text-left shadow-[0_12px_32px_rgba(17,17,17,0.2)]"
        style={{ backgroundColor: '#1F1A12', border: '1px solid rgba(200,155,47,0.28)' }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'rgba(200,155,47,0.65)' }}>
          Runtime Hydrated
        </p>
        <p className="mt-1 text-[15px] font-semibold text-[#F6EFDF]">{lines.join(' · ')}</p>
        <p className="mt-1 text-[11px]" style={{ color: 'rgba(200,155,47,0.48)' }}>Tap to dismiss</p>
      </button>
    </div>
  )
}

function NewShowTelaModal({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreate = () => {
    const trimmed = name.trim()
    const id = createShowTelaId(trimmed)
    if (!id) return
    setCreating(true)
    router.push(`/showtela/${id}`)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[430px] rounded-t-[28px] px-5 pb-10 pt-6 md:max-w-[680px] xl:max-w-[760px]"
        style={{ backgroundColor: '#0D0E12', border: '1px solid rgba(200,155,47,0.18)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-1 h-1 w-10 mx-auto rounded-full" style={{ backgroundColor: 'rgba(200,155,47,0.28)' }} />
        <p
          className="mt-5 text-[10px] font-semibold uppercase tracking-[0.26em]"
          style={{ color: 'rgba(200,155,47,0.52)' }}
        >
          New ShowTELA
        </p>
        <p className="mt-2 text-[20px] font-semibold" style={{ color: '#F8F6F2' }}>
          Name your ShowTELA
        </p>
        <p className="mt-1.5 text-[12px]" style={{ color: 'rgba(200,155,47,0.48)' }}>
          e.g. Positive Rocks Spring 2027, Crusade, Brandon Lake Tour
        </p>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
          placeholder="ShowTELA name"
          autoFocus
          className="mt-5 w-full rounded-[16px] px-4 py-3.5 text-[16px] font-medium outline-none"
          style={{
            backgroundColor: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(200,155,47,0.22)',
            color: '#F8F6F2',
          }}
        />
        <button
          onClick={handleCreate}
          disabled={!name.trim() || creating}
          className="mt-4 w-full rounded-[18px] py-4 text-[15px] font-semibold transition-opacity disabled:opacity-40"
          style={{ backgroundColor: '#C89B2F', color: '#0D0E12' }}
        >
          {creating ? 'Creating…' : 'Create ShowTELA'}
        </button>
      </div>
    </div>
  )
}

function NewShowTelaChoiceSheet({
  onNewShowTela,
  onAddContent,
  onClose,
}: {
  onNewShowTela: () => void
  onAddContent: () => void
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[430px] rounded-t-[28px] px-5 pb-10 pt-6 md:max-w-[680px] xl:max-w-[760px]"
        style={{ backgroundColor: '#0D0E12', border: '1px solid rgba(200,155,47,0.18)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-1 h-1 w-10 mx-auto rounded-full" style={{ backgroundColor: 'rgba(200,155,47,0.28)' }} />
        <div className="mt-5 flex flex-col gap-3">
          <button
            onClick={onNewShowTela}
            className="flex items-center justify-between rounded-[18px] px-4 py-4 text-left transition-opacity hover:opacity-90 active:opacity-75"
            style={{ backgroundColor: '#C89B2F' }}
          >
            <div>
              <p className="text-[15px] font-semibold" style={{ color: '#0D0E12' }}>New ShowTELA</p>
              <p className="mt-0.5 text-[12px]" style={{ color: 'rgba(0,0,0,0.55)' }}>Create a fresh operational runtime</p>
            </div>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ opacity: 0.6 }}>
              <path d="M7 1v12M1 7h12" stroke="#0D0E12" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </button>
          <button
            onClick={onAddContent}
            className="flex items-center justify-between rounded-[18px] px-4 py-4 text-left transition-opacity hover:opacity-90 active:opacity-75"
            style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(200,155,47,0.18)' }}
          >
            <div>
              <p className="text-[15px] font-semibold" style={{ color: '#F8F6F2' }}>Add Content</p>
              <p className="mt-0.5 text-[12px]" style={{ color: 'rgba(200,155,47,0.48)' }}>Upload a document, voice note, or update</p>
            </div>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ opacity: 0.4 }}>
              <path d="M3 7h8M7 3l4 4-4 4" stroke="#C89B2F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export function ShowTelaShell({ vm, user, briefing, focus, replay, projection, showTelaId }: {
  vm: ShowTelaViewModel
  user?: { name: string; email: string; image: string }
  briefing: OperationalBrief
  focus: FocusEngineResult
  replay: ReplayOutput
  projection: OperationalProjection
  showTelaId?: string
}) {
  const router = useRouter()
  const initialSurface = getInitialSurfaceState()
  const [tab, setTab] = useState<Tab>(initialSurface.tab)
  const [showVoice, setShowVoice] = useState(false)
  const [showIngest, setShowIngest] = useState(initialSurface.showIngest)
  const [ingestMode, setIngestMode] = useState<ContinuityIngestionMode | null>(initialSurface.ingestMode)
  const [taggedPerson, setTaggedPerson] = useState<string | undefined>(undefined)
  const [isRefreshing, startRefresh] = useTransition()
  const [sheet, setSheet] = useState<Sheet>(null)
  const [hydrationSummary, setHydrationSummary] = useState<DocumentHydration | null>(null)
  const [showNewShowTelaChoice, setShowNewShowTelaChoice] = useState(false)
  const [showCreateShowTela, setShowCreateShowTela] = useState(false)
  const openVoice = (person?: string) => { setTaggedPerson(person); setShowVoice(true) }
  const openIngest = (mode?: ContinuityIngestionMode | null) => {
    if ((mode === null || mode === undefined) && !showTelaId) {
      setShowNewShowTelaChoice(true)
    } else {
      setIngestMode(mode ?? null)
      setShowIngest(true)
    }
  }
  const vmUnresolved = useMemo(() => vm.unresolved ?? [], [vm.unresolved])
  const feed = vm.feed.map(mapVmFeedItem)
  const operations = vm.crusadeOperations
  const activeOpsData = vm.activeOps
  const runtimeTimeline = vm.runtimeTimeline
  const unresolvedItemsState = vmUnresolved
  const latestTimeline = runtimeTimeline?.[0]
  const unresolvedPressure = derivePressure(unresolvedItemsState)
  const priorityOperation = operations[0]
  const recentFeedItem = feed[0]
  const operationalEvents = vm.operationalEvents ?? []
  // Suppress infrastructure-derived projection cards when operational events exist.
  // Movement comes from real show dates and rehearsals, not thread/governance heuristics.
  const operationalCards = operationalEvents.length > 0 ? [] : projectionCards(projection)
  const activeOperators = useMemo(() => activeOpsData.map((item) => item.name), [activeOpsData])
  const userFirstName = user?.name?.split(' ')[0]?.toLowerCase()
  const visibleActiveOps = activeOpsData.filter((item) => {
    if (!userFirstName) return true
    // Match on first word only — substring would catch "Jack Jones" when user is "Jon"
    const itemFirst = item.name.split(' ')[0]?.toLowerCase()
    return itemFirst !== userFirstName
  })

  const isEmpty = feed.length === 0 && activeOpsData.length === 0
  const runtimeLabel = priorityOperation?.label || priorityOperation?.name || feed[0]?.linkedEntities?.[0] || 'Operational Runtime'
    console.log('[TELA:TRACE] isEmpty eval', {
      vmSource: vm.source,
      activeOpsLength: activeOpsData.length,
      operationsLength: operations.length,
      isEmpty,
    })

  const autoscan = {
    currentTruth: priorityOperation
        ? (priorityOperation.unresolvedCount ?? 0) > 0
          ? `${priorityOperation.label} currently carries the highest unresolved operational pressure.`
          : `${priorityOperation.label} is operational. Field is clear.`
        : 'Operational pressure is evenly distributed across the field.',
    mattersNow: latestTimeline
      ? `${latestTimeline.summary} stabilized most recently${latestTimeline.timestamp ? ` at ${formatTimelineTime(latestTimeline.timestamp)}` : ''}${latestTimeline.actor ? ` through ${latestTimeline.actor}` : ''}.`
      : 'No new continuity drift surfaced in the latest autoscan.',
    nextMovement: priorityOperation?.latest
        ? `Next meaningful movement is ${priorityOperation.latest.toLowerCase()}.`
        : 'Next meaningful movement is confirming the highest-pressure thread.',
    blockersLabel: undefined,
    movementLabel: undefined,
    readinessLabel: undefined,
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

  const calendarBaseDate = useMemo(() => new Date(), [])

  const calendarEvents = useMemo(
    () => operationalEvents.length > 0
      ? buildCalendarFromOperationalEvents(operationalEvents, { baseDate: calendarBaseDate })
      : [],
    [operationalEvents, calendarBaseDate],
  )

  const operationalReadiness = useMemo(
    () => calculateOperationalReadiness({
      operationalEvents,
      crewCount: vm.activeOps.length,
      blockersCount: vm.unresolvedPressure.blockedCount,
      baseDate: calendarBaseDate,
    }),
    [operationalEvents, vm.activeOps.length, vm.unresolvedPressure.blockedCount, calendarBaseDate],
  )

  async function submitContinuity(input: ContinuityIngestionInput) {
    try {
      const isDocumentUpload = input.mode === 'upload-files' && (input.assetContents?.length ?? 0) > 0
      const endpoint = isDocumentUpload
        ? '/api/runtime/continuity/ingest-document'
        : '/api/runtime/continuity/ingest'

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(showTelaId ? { ...input, showTelaId } : input),
      })
      const data = await res.json() as { error?: string; hydration?: DocumentHydration }
      if (!res.ok || data.error) throw new Error(data.error ?? `HTTP ${res.status}`)

      if (data.hydration) setHydrationSummary(data.hydration)

      startRefresh(() => { router.refresh() })
      return true
    } catch (err) {
      console.error('[ShowTelaShell] continuity ingest failed:', err)
      return false
    }
  }

  function handleResolveOperation(name: string, detail?: { movement: string; unresolvedTitles: string[] }) {
    const detailLine = detail?.movement?.trim()
    const firstUnresolved = detail?.unresolvedTitles?.[0]?.trim()
    const body = [
      `${name} stabilized.`,
      detailLine ? `Latest movement: ${detailLine}.` : null,
      firstUnresolved ? `Primary cleared item: ${firstUnresolved}.` : null,
    ].filter(Boolean).join(' ')

    void submitContinuity({
      mode: 'quick-update',
      headline: `${name} stabilized`,
      body,
      owner: user?.name ?? 'TELA',
      operation: name,
      linkedEntity: name,
      tags: ['resolution', 'stabilized'],
    })
  }

  return (
    <main
      style={{ backgroundColor: '#F8F6F2', color: '#141210' }}
      className="relative mx-auto min-h-screen w-full max-w-[430px] pb-36 md:max-w-[680px] xl:max-w-[760px]"
    >
      {/* Opening surface — renders full-screen when no continuity exists yet */}
      {isEmpty && (
        <OpeningSurface user={user} onOpenIngest={openIngest} />
      )}

      {/* Operational runtime — only rendered when continuity exists */}
      {!isEmpty && (
        <>
          {tab === 'home' && (
            <>
              <ShowTelaHeader
                userName={user?.name}
                autoscan={autoscan}
                onNextMovementTap={priorityOperation ? () => setSheet({ type: 'operation', name: priorityOperation.label }) : undefined}
                isEmpty={false}
                runtimeLabel={runtimeLabel}
                statusLabel={undefined}
              />
              <BriefingCard briefing={briefing} />
              <FocusCard focus={focus} />
              {operationalCards.length > 0 && (
                <section className="px-5 pb-5">
                  <div className="grid gap-3">
                    {operationalCards.map((state) => (
                      <article
                        key={state.stateId}
                        className={`rounded-[22px] border px-5 py-4 shadow-[0_12px_24px_rgba(17,17,17,0.05)] ${stateTone(state.severity)}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] opacity-70">{state.stateCode.replaceAll('_', ' ')}</p>
                            <p className="mt-2 text-[16px] font-semibold leading-snug">{state.stateLabel}</p>
                            <p className="mt-2 text-[12px] leading-relaxed opacity-80">{state.explanation ?? state.triggerDetail}</p>
                          </div>
                          <p className="text-[11px] font-semibold opacity-70">{state.lifecycle}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )}
              <ActiveOpsRail
                userName={user?.name}
                userImage={user?.image}
                items={visibleActiveOps.map((item) => ({ id: item.id, name: item.name, latest: item.latest, unresolvedCount: item.unresolvedCount ?? 0, image: item.image, updatesCount: 0 }))}
                onProfileTap={() => setTab('profile')}
                onTelaTap={() => setTab('messages')}
                onPersonTap={(name, role) => setSheet({ type: 'person', name, role })}
                onAddContinuity={() => openIngest(null)}
                isEmpty={false}
              />
              <CalendarWeekRail events={calendarEvents} baseDate={calendarBaseDate} onOpenCalendar={() => setTab('calendar')} isEmpty={false} />
              <CrusadeOperationsRail items={operations} unresolvedItems={unresolvedItemsState} onOperationTap={(name) => setSheet({ type: 'operation', name })} />
              <UnresolvedPressureCard pressure={unresolvedPressure} onOpen={() => setSheet({ type: 'unresolved' })} />
              <DepartmentsRail departments={vm.departments ?? []} />
              <VenueIntelligenceRail
                venues={vm.venues ?? []}
                onTapVenue={(venueId) => {
                  const venue = vm.venues?.find(v => v.id === venueId)
                  if (venue) setSheet({ type: 'venue', venueId, venueName: venue.name })
                }}
              />
              <TELAwhyCard
                crewCount={vm.activeOps.length}
                departmentCount={vm.departments?.length ?? 0}
                calendarCount={operationalEvents.filter(e => e.kind === 'show_day').length}
                readiness={operationalReadiness.score}
                lastFeedItem={feed[0] ? { timestamp: feed[0].timestamp ?? '', owner: feed[0].owner?.name ?? '' } : undefined}
              />
              <ReplayCard replay={replay} />
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

          {tab === 'messages' && (
            <TelaTalk
              autoscan={autoscan}
              feed={feed}
              operations={operations}
              unresolvedItems={unresolvedItemsState}
              calendarEvents={calendarEvents}
              submittedBy={user?.name}
              onContinuityIngest={submitContinuity}
            />
          )}

          {tab === 'calendar' && (
            <OperationalCalendar events={calendarEvents} baseDate={calendarBaseDate} onOpenVoice={() => openVoice(user?.name)} />
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
                  <h2 className="mt-3 text-xl font-semibold text-stone-900">{user?.name ?? 'Operator'}</h2>
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
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9A7C46]">Calendar</p>
                  <p className="mt-2 text-[15px] font-semibold text-[#171411]">Today At A Glance</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-[#6B5D4B]">See what matters today, what may slip, and the next move.</p>
                </button>
              </div>
              <a href="/api/auth/signout" className="mt-4 flex items-center justify-between rounded-2xl bg-white px-4 py-3.5 shadow-sm">
                <p className="text-sm font-medium text-red-500">Sign Out</p>
              </a>
            </div>
          )}

          <BottomDock activeTab={tab} onTabChange={setTab} userImage={user?.image} userName={user?.name} />
          <PersonSheet open={sheet?.type === 'person'} name={sheet?.type === 'person' ? sheet.name : ''} role={sheet?.type === 'person' ? sheet.role : undefined} onClose={() => setSheet(null)} />
          <FeedSheet open={sheet?.type === 'feed'} item={sheet?.type === 'feed' ? sheet.item : null} onClose={() => setSheet(null)} />
          <OperationSheet open={sheet?.type === 'operation'} name={sheet?.type === 'operation' ? sheet.name : ''} onClose={() => setSheet(null)} onResolve={handleResolveOperation} />
          <UnresolvedSheet open={sheet?.type === 'unresolved'} items={unresolvedItemsState} onClose={() => setSheet(null)} />
          <VenueSheet open={sheet?.type === 'venue'} venueId={sheet?.type === 'venue' ? sheet.venueId : ''} venueName={sheet?.type === 'venue' ? sheet.venueName : ''} onClose={() => setSheet(null)} />
        </>
      )}

      {/* Voice + ingest always available regardless of continuity state */}
      {showVoice && <PearlDropVoice taggedPerson={taggedPerson} submittedBy={user?.name} onClose={() => { setShowVoice(false); setTaggedPerson(undefined) }} />}
      {showIngest && (
        <ContinuityIngest
          open={showIngest}
          ownerName={user?.name}
          people={activeOpsData.map((item) => ({ id: item.id, label: item.name }))}
          operations={operations.map((item) => ({ id: item.id, label: item.label }))}
          initialMode={ingestMode}
          onClose={() => { setShowIngest(false); setIngestMode(null) }}
          onVoiceNote={() => openVoice(user?.name)}
          onSubmit={submitContinuity}
        />
      )}
      {isRefreshing && (
        <div className="pointer-events-none fixed bottom-24 left-1/2 z-[80] -translate-x-1/2 rounded-full bg-[#17130F] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#F7E8C2]">
          Syncing runtime
        </div>
      )}
      {hydrationSummary && (
        <HydrationSummaryBanner hydration={hydrationSummary} onDismiss={() => setHydrationSummary(null)} />
      )}
      {showNewShowTelaChoice && (
        <NewShowTelaChoiceSheet
          onNewShowTela={() => { setShowNewShowTelaChoice(false); setShowCreateShowTela(true) }}
          onAddContent={() => { setShowNewShowTelaChoice(false); setIngestMode(null); setShowIngest(true) }}
          onClose={() => setShowNewShowTelaChoice(false)}
        />
      )}
      {showCreateShowTela && (
        <NewShowTelaModal onClose={() => setShowCreateShowTela(false)} />
      )}
    </main>
  )
}
