'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useMemo, useState, useTransition } from 'react'
import { ContinuityIngest } from '@/components/runtime/continuity-ingest'
import type { ContinuityIngestionInput, ContinuityIngestionMode } from '@/lib/continuity/normalize-ingestion'
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
import { PearlDropVoice } from './PearlDropVoice'
import { TelaTalk } from './TelaTalk'
import { TELAwhyCard } from './TELAwhyCard'
import { BottomSheet } from './sheets/BottomSheet'
import { WorkspaceSwitcher } from './WorkspaceSwitcher'
import type { OperationEntity, ShowTelaViewModel, UnresolvedItem, UnresolvedPressure } from './types'
import type { ContinuityEvent, TELAwhy } from '@/lib/showtela/types'
import type { OperationalProjection, OperationalStateRecord } from '@/lib/runtime/state/model'
import { buildInsufficientTELAwhy } from '@/lib/showtela/telawhy'

type Tab = 'home' | 'play' | 'messages' | 'calendar' | 'profile'
type Sheet =
  | { type: 'person'; name: string; role?: string }
  | { type: 'feed'; item: ContinuityEvent }
  | { type: 'operation'; name: string }
  | { type: 'unresolved' }
  | { type: 'why'; title: string; why: TELAwhy }
  | null

const CONSTITUTION = {
  home: {
    eyebrow: 'Today\'s Picture',
    title: 'What changed. Why it matters. What to know.',
    sources: ['Recent Updates', 'Saved Records', 'Readiness', 'Why It Matters'],
  },
  play: {
    eyebrow: 'Active Projects',
    title: 'Projects in motion.',
    subtitle: 'Projects, files, people, and readiness signals in one view.',
    sources: ['Projects', 'Files', 'People', 'Readiness'],
  },
} as const

function getInitialSurfaceState(): {
  tab: Tab
  showIngest: boolean
  ingestMode: ContinuityIngestionMode | null
  proofMode: boolean
} {
  if (typeof window === 'undefined') {
    return {
      tab: 'home',
      showIngest: false,
      ingestMode: null,
      proofMode: false,
    }
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
    proofMode: params.get('showtela_proof') === '1',
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

function formatTimelineDay(iso?: string) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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
    telaWhy: item.telaWhy ?? buildInsufficientTELAwhy({
      id: item.id,
      title: item.title,
      detail: 'Not enough saved context: this update does not yet have a source file attached.',
      lastUpdated: item.timestamp,
    }),
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

function pressureTone(count?: number) {
  if ((count ?? 0) >= 3) return { label: 'Attention', bg: '#2A1715', fg: '#F6C7BE', ring: '#D87363' }
  if ((count ?? 0) > 0) return { label: 'Watch', bg: '#2A2118', fg: '#F4D7A1', ring: '#C89B2F' }
  return { label: 'Ready', bg: '#E8F0E2', fg: '#355131', ring: '#8EA58E' }
}

function readinessPercent(item: OperationEntity) {
  const unresolved = item.unresolvedCount ?? 0
  return Math.max(18, Math.min(96, 86 - unresolved * 12))
}

function firstSentence(value?: string) {
  if (!value) return ''
  return value.split(/[.!?]/)[0]?.trim() ?? value
}

function formatChangedTimestamp(iso?: string) {
  if (!iso) return 'Unavailable'
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return 'Unavailable'
  }
}

function WhatChangedCard({
  item,
  onWhy,
}: {
  item?: ShowTelaViewModel['continuityTimeline'][number]
  onWhy: (title: string, why?: TELAwhy) => void
}) {
  if (!item) return null

  const sourceArtifact = item.telaWhy?.sourceArtifact?.title ?? item.telaWhy?.sourceArtifact?.id ?? 'Source file unavailable'
  const eventId = item.telaWhy?.evidenceRefs?.eventId ?? item.id
  const continuityRecordId = item.telaWhy?.evidenceRefs?.continuityRecordId ?? item.id

  return (
    <section className="px-5 pb-5">
      <article className="rounded-[24px] border border-[#D8C8AC] bg-[#FFFDF8] px-5 py-5 shadow-[0_12px_24px_rgba(17,17,17,0.04)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8E7551]">What Changed Since Last Visit?</p>
            <h2 className="mt-2 text-[18px] font-semibold leading-snug text-[#171411]">{item.title}</h2>
            <p className="mt-2 text-[13px] leading-[1.6] text-[#62584D]">{item.description}</p>
          </div>
          <span className="rounded-full border border-[#E2D7C7] bg-[#FBF7F0] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7A6240]">
            {formatChangedTimestamp(item.timestamp)}
          </span>
        </div>
        <div className="mt-4 grid gap-2 text-[12px] leading-relaxed text-[#5E5348] sm:grid-cols-3">
          <div className="rounded-[14px] bg-[#F8F3EA] px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8A7351]">Source File</p>
            <p className="mt-1 break-words">{sourceArtifact}</p>
          </div>
          <div className="rounded-[14px] bg-[#F8F3EA] px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8A7351]">Saved Update</p>
            <p className="mt-1 break-words">{eventId}</p>
          </div>
          <div className="rounded-[14px] bg-[#F8F3EA] px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8A7351]">Record ID</p>
            <p className="mt-1 break-words">{continuityRecordId}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onWhy(item.title, item.telaWhy)}
          className="mt-4 rounded-full border border-[#D8C8AC] bg-[#171411] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#F7E8C2]"
        >
          Why this matters
        </button>
      </article>
    </section>
  )
}

export function ShowTelaShell({
  vm,
  user,
  workspaceId,
  showTelaId,
  showTelaName,
  showTelaCreated,
  activeShowTelas = [],
  onHydrate,
}: {
  vm: ShowTelaViewModel
  user?: { name: string; email: string; image: string }
  workspaceId: string
  showTelaId?: string
  showTelaName?: string
  showTelaCreated?: boolean
  activeShowTelas?: Array<{ showTelaId: string; showTelaName: string }>
  onHydrate?: () => Promise<boolean>
}) {
  const initialSurface = getInitialSurfaceState()
  const [tab, setTab] = useState<Tab>(initialSurface.tab)
  const [showVoice, setShowVoice] = useState(false)
  const [showIngest, setShowIngest] = useState(initialSurface.showIngest)
  const [ingestMode, setIngestMode] = useState<ContinuityIngestionMode | null>(initialSurface.ingestMode)
  const proofMode = initialSurface.proofMode
  const [taggedPerson, setTaggedPerson] = useState<string | undefined>(undefined)
  const [isRefreshing, startRefresh] = useTransition()
  const [sheet, setSheet] = useState<Sheet>(null)
  const openWhy = (title: string, why?: TELAwhy) => {
    setSheet({
      type: 'why',
      title,
      why: why ?? buildInsufficientTELAwhy({
        id: title,
        title,
        detail: 'Not enough saved context: this screen does not yet have a source summary attached.',
      }),
    })
  }
  const openVoice = (person?: string) => { setTaggedPerson(person); setShowVoice(true) }
  const openIngest = (mode?: ContinuityIngestionMode | null) => { setIngestMode(mode ?? null); setShowIngest(true) }
  const vmUnresolved = useMemo(() => vm.unresolved ?? [], [vm.unresolved])
  const feed = vm.feed.map(mapVmFeedItem)
  const operations = vm.crusadeOperations
  const activeOpsData = vm.activeOps
  const runtimeTimeline = vm.runtimeTimeline
  const continuityTimeline = vm.continuityTimeline
  const latestContinuityChange = continuityTimeline[0]
  const showTelaHealth = vm.showTelaHealth
  const showTelaStatus = vm.showTelaStatus
  const unresolvedItemsState = vmUnresolved
  const latestTimeline = runtimeTimeline?.[0]
  const unresolvedPressure = derivePressure(unresolvedItemsState)
  const priorityOperation = operations[0]
  const recentFeedItem = feed[0]
  const operationalCards = projectionCards(undefined)
  const activeOperators = useMemo(() => activeOpsData.map((item) => item.name), [activeOpsData])
  const userFirstName = user?.name?.split(' ')[0]?.toLowerCase()
  const visibleActiveOps = activeOpsData.filter((item) => {
    if (!userFirstName) return true
    return item.name.toLowerCase() !== userFirstName && !item.name.toLowerCase().includes(userFirstName)
  })

  const runtimeLabel = priorityOperation?.label || priorityOperation?.name || feed[0]?.linkedEntities?.[0] || 'ShowTELA'
  const proofLinkSuffix = proofMode ? `${showTelaId ? '&' : workspaceId ? '&' : '?'}showtela_proof=1` : ''

  const autoscan = {
    currentTruth: showTelaStatus === 'archived'
      ? 'This ShowTELA is archived. Replay remains available.'
      : priorityOperation
          ? (priorityOperation.unresolvedCount ?? 0) > 0
            ? `${priorityOperation.label} currently carries the highest unresolved operational pressure.`
            : `${priorityOperation.label} is operational. Field is clear.`
          : 'Operational pressure is evenly distributed across the field.',
    mattersNow: latestTimeline
      ? `${latestTimeline.summary} stabilized most recently${latestTimeline.timestamp ? ` at ${formatTimelineTime(latestTimeline.timestamp)}` : ''}${latestTimeline.actor ? ` through ${latestTimeline.actor}` : ''}.`
      : continuityTimeline[0]
        ? `${continuityTimeline[0].title}${continuityTimeline[0].timestamp ? ` at ${formatTimelineTime(continuityTimeline[0].timestamp)}` : ''}.`
        : 'No new changes appeared in the latest check.',
    nextMovement: showTelaStatus === 'archived'
      ? 'Review saved history below.'
      : priorityOperation?.latest
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
        label: 'Inspect latest update',
        detail: recentFeedItem
          ? `${recentFeedItem.headline}${recentFeedItem.owner?.name ? ` from ${recentFeedItem.owner.name}` : ''}.`
          : 'No saved updates are currently ahead of the feed.',
      },
      {
        id: 'operator',
        label: activeOperators[0] ? `Pulse ${activeOperators[0]}` : 'Pulse active operators',
        detail: activeOperators[0]
          ? `${activeOperators[0]} is the fastest path to clarifying current field movement.`
          : 'Use a quick update to clarify current movement.',
      },
    ],
    latestChange: recentFeedItem ? `${recentFeedItem.headline}${recentFeedItem.body ? ` — ${recentFeedItem.body}` : ''}` : undefined,
    activeOperators: activeOperators.slice(0, 6),
  }

  const calendarEvents = useMemo(() => vm.calendarEvents ?? [], [vm.calendarEvents])
  const calendarBaseDate = useMemo(() => {
    const anchor = calendarEvents[0]?.timestamp || latestTimeline?.timestamp || recentFeedItem?.timestamp
    return anchor ? new Date(anchor) : new Date()
  }, [calendarEvents, latestTimeline?.timestamp, recentFeedItem?.timestamp])
  const isEmpty = (
    activeOpsData.length === 0 &&
    operations.length === 0 &&
    unresolvedItemsState.length === 0 &&
    feed.length === 0 &&
    calendarEvents.length === 0
  )
  const creationSummary = showTelaCreated
    ? {
        people: activeOpsData.length,
        operations: operations.length,
        calendar: calendarEvents.length,
        artifacts: vm.hydration?.counts.artifacts ?? 0,
        events: vm.feed.length,
      }
    : null

  console.log('[TELA:TRACE] isEmpty eval', {
    vmSource: vm.source,
    activeOpsLength: activeOpsData.length,
    operationsLength: operations.length,
    isEmpty,
  })

  async function submitContinuity(input: ContinuityIngestionInput) {
    try {
      const proofQuery = proofMode ? '?showtela_proof=1' : ''
      const res = await fetch(`/api/runtime/continuity/ingest${proofQuery}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...input, workspaceId }),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok || data.error) throw new Error(data.error ?? `HTTP ${res.status}`)
      if (onHydrate) {
        startRefresh(() => {
          void onHydrate().catch((err) => {
            console.error('[ShowTelaShell] post-ingest hydration failed:', err)
          })
        })
      }
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
        <OpeningSurface
          user={user}
          onOpenIngest={openIngest}
          showTelaName={showTelaName ?? undefined}
          creationSummary={creationSummary}
        />
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
                runtimeLabel={CONSTITUTION.home.eyebrow}
                statusLabel={showTelaStatus === 'archived' ? 'saved history' : 'sources live'}
              />
              <section className="px-5 pb-5">
                <div className="rounded-[24px] border border-[#E2D7C7] bg-white px-5 py-5 shadow-[0_12px_24px_rgba(17,17,17,0.04)]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8E7551]">ShowTELA Health</p>
                      <p className="mt-2 text-[18px] font-semibold text-[#171411]">
                        {showTelaStatus === 'archived' ? 'Saved history intact' : 'Updates are saving'}
                      </p>
                      <p className="mt-1 text-[12px] leading-relaxed text-[#6B5D4B]">{CONSTITUTION.home.title}</p>
                    </div>
                    <div className="rounded-full border border-[#E7DCCB] bg-[#FBF7F0] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7A6240]">
                      {showTelaHealth.lastActivityAt ? `Last ${formatTimelineTime(showTelaHealth.lastActivityAt)}` : 'No activity'}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {CONSTITUTION.home.sources.map((source) => (
                      <span key={source} className="rounded-full bg-[#F6F0E7] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8A7351]">
                        {source}
                      </span>
                    ))}
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
                    {[
                      ['People', showTelaHealth.people],
                      ['Operations', showTelaHealth.operations],
                      ['Calendar Events', showTelaHealth.calendarEvents],
                      ['Files', showTelaHealth.artifacts],
                      ['Events', showTelaHealth.events],
                    ].map(([label, value]) => (
                      <div key={String(label)} className="rounded-[18px] border border-[#EFE7DB] bg-[#FCFAF6] px-3 py-3">
                        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#8C7B65]">{label}</p>
                        <p className="mt-2 text-[22px] font-semibold tracking-[-0.03em] text-[#171411]">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
              <WhatChangedCard item={latestContinuityChange} onWhy={openWhy} />
              <section className="px-5 pb-5">
                <div className="rounded-[24px] border border-[#E2D7C7] bg-white px-5 py-5 shadow-[0_12px_24px_rgba(17,17,17,0.04)]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8E7551]">Update History</p>
                      <p className="mt-2 text-[18px] font-semibold text-[#171411]">Review saved changes and the sources behind them.</p>
                    </div>
                  </div>
                  <div className="mt-5 space-y-4">
                    {continuityTimeline.slice(0, 10).map((item) => (
                      <article key={item.id} className="flex gap-4 border-t border-[#F0E8DD] pt-4 first:border-t-0 first:pt-0">
                        <div className="w-[56px] flex-shrink-0 text-right">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9A7C46]">{formatTimelineDay(item.timestamp)}</p>
                          <p className="mt-1 text-[12px] text-[#7C7267]">{formatTimelineTime(item.timestamp)}</p>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[15px] font-semibold text-[#171411]">{item.title}</p>
                          <p className="mt-1 text-[12px] font-medium uppercase tracking-[0.12em] text-[#9B8C77]">{item.eventType.replaceAll('_', ' ')}</p>
                          <p className="mt-2 text-[13px] leading-[1.6] text-[#62584D]">{item.description}</p>
                          <button
                            type="button"
                            onClick={() => openWhy(item.title, item.telaWhy)}
                            className="mt-3 rounded-full border border-[#D8C8AC] bg-[#FBF7EF] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7A6240]"
                          >
                            Why this matters
                          </button>
                        </div>
                      </article>
                    ))}
                    {continuityTimeline.length === 0 && (
                      <div className="rounded-[18px] border border-dashed border-[#D4C9B4] px-4 py-8 text-center">
                        <p className="text-[13px] font-medium text-[#8B847B]">No saved updates exist yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              </section>
              <section className="px-5 pb-5">
                <Link
                  href={showTelaId
                    ? `/showtela/venues?showtela=${encodeURIComponent(showTelaId)}${proofLinkSuffix}`
                    : `/showtela/venues${workspaceId ? `?workspace=${encodeURIComponent(workspaceId)}${proofLinkSuffix}` : proofMode ? '?showtela_proof=1' : ''}`}
                  className="block rounded-[24px] border border-[#E1D6C7] bg-[linear-gradient(135deg,#FFF9EF_0%,#F0E4CF_100%)] px-5 py-5 shadow-[0_12px_24px_rgba(17,17,17,0.05)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9A7C46]">Venue Dashboard</p>
                      <p className="mt-2 text-[17px] font-semibold leading-snug text-[#171411]">Upload technical packets and score venue readiness.</p>
                      <p className="mt-2 text-[12px] leading-[1.6] text-[#6E6A63]">Extract. Normalize. Compare against the active rider. Save the report into Supabase.</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6F541A]">Open</span>
                  </div>
                </Link>
              </section>
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
                proofMode={proofMode}
              />
              <CalendarWeekRail events={calendarEvents} baseDate={calendarBaseDate} onOpenCalendar={() => setTab('calendar')} isEmpty={false} />
              <CrusadeOperationsRail items={operations} unresolvedItems={unresolvedItemsState} onOperationTap={(name) => setSheet({ type: 'operation', name })} />
              <UnresolvedPressureCard pressure={unresolvedPressure} onOpen={() => setSheet({ type: 'unresolved' })} />
              <ContinuityFeed feed={feed} onFeedTap={(item) => setSheet({ type: 'feed', item })} onWhyTap={(item) => openWhy(item.headline, item.telaWhy)} />
            </>
          )}

          {tab === 'play' && (
            <div className="min-h-screen bg-[#F8F6F2] px-5 pb-32 pt-14">
              <header>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9A7C46]">{CONSTITUTION.play.eyebrow}</p>
                <h1 className="mt-1 text-[30px] font-semibold leading-tight tracking-[-0.04em] text-[#141210]">{CONSTITUTION.play.title}</h1>
                <p className="mt-2 max-w-[320px] text-[13px] leading-relaxed text-[#6B5D4B]">{CONSTITUTION.play.subtitle}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {CONSTITUTION.play.sources.map((source) => (
                    <span key={source} className="rounded-full border border-[#E1D6C7] bg-[#FFFDF8] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8A7351]">
                      {source}
                    </span>
                  ))}
                </div>
              </header>

              <section className="mt-5 grid grid-cols-3 gap-2">
                <div className="rounded-[18px] bg-[#17130F] px-3 py-3 text-[#F8F1E2]">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[#D7BC7F]">Projects</p>
                  <p className="mt-1 text-[22px] font-semibold leading-none">{operations.length}</p>
                </div>
                <div className="rounded-[18px] bg-[#FFFDF8] px-3 py-3 shadow-[0_8px_20px_rgba(27,22,16,0.05)]">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[#9A7C46]">Attention</p>
                  <p className="mt-1 text-[22px] font-semibold leading-none text-[#17130F]">{unresolvedItemsState.length}</p>
                </div>
                <div className="rounded-[18px] bg-[#FFFDF8] px-3 py-3 shadow-[0_8px_20px_rgba(27,22,16,0.05)]">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[#9A7C46]">Files</p>
                  <p className="mt-1 text-[22px] font-semibold leading-none text-[#17130F]">{vm.hydration?.counts.artifacts ?? showTelaHealth.artifacts}</p>
                </div>
              </section>

              <section className="mt-5">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5E5348]">Active Projects</h2>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8A7351]">{runtimeLabel}</p>
                </div>
                <div className="flex flex-col gap-3">
                  {operations.map((operation) => {
                    const tone = pressureTone(operation.unresolvedCount)
                    const percent = readinessPercent(operation)
                    const linkedFeed = feed.find((item) => item.linkedEntities?.includes(operation.label) || item.linkedEntities?.includes(operation.name))
                    return (
                      <article key={operation.id} className="overflow-hidden rounded-[24px] border border-[#E4D8C9] bg-[#FFFDF8] shadow-[0_12px_30px_rgba(27,22,16,0.06)]">
                        <button
                          type="button"
                          onClick={() => setSheet({ type: 'operation', name: operation.label })}
                          className="grid w-full grid-cols-[96px_1fr] gap-3 p-3 text-left"
                        >
                          <div className="relative h-[96px] overflow-hidden rounded-[18px] bg-[#17130F]">
                            <Image src={operation.image} alt="" fill sizes="96px" className="object-cover" unoptimized />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#9A7C46]">Project</p>
                                <h3 className="mt-1 text-[18px] font-semibold leading-tight text-[#17130F]">{operation.label}</h3>
                              </div>
                              <span className="flex-shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ backgroundColor: tone.bg, color: tone.fg }}>
                                {tone.label}
                              </span>
                            </div>
                            <p className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-[#62564B]">
                              {operation.latest ? firstSentence(operation.latest) : linkedFeed?.body ?? 'This project is ready for the next move.'}
                            </p>
                            <div className="mt-3">
                              <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8A7351]">
                                <span>Readiness</span>
                                <span>{percent}%</span>
                              </div>
                              <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#EFE6D8]">
                                <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: tone.ring }} />
                              </div>
                            </div>
                          </div>
                        </button>
                        <div className="grid grid-cols-3 border-t border-[#EEE4D6] text-center">
                          <div className="px-2 py-2">
                            <p className="text-[15px] font-semibold text-[#17130F]">{operation.unresolvedCount ?? 0}</p>
                            <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8B847B]">Attention</p>
                          </div>
                          <div className="border-x border-[#EEE4D6] px-2 py-2">
                            <p className="text-[15px] font-semibold text-[#17130F]">{feed.filter((item) => item.linkedEntities?.includes(operation.label) || item.linkedEntities?.includes(operation.name)).length}</p>
                            <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8B847B]">Events</p>
                          </div>
                          <div className="px-2 py-2">
                            <p className="text-[15px] font-semibold text-[#17130F]">{activeOpsData.length}</p>
                            <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8B847B]">People</p>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                  {operations.length === 0 && (
                    <div className="rounded-[22px] border border-dashed border-[#D6C9B7] px-4 py-8 text-center">
                      <p className="text-[13px] font-semibold text-[#6B5D4B]">No projects exist yet.</p>
                      <p className="mt-1 text-[12px] leading-relaxed text-[#8B847B]">Upload a file or add an update to create the first project.</p>
                    </div>
                  )}
                </div>
              </section>

              <section className="mt-5 rounded-[24px] border border-[#E3D8C7] bg-white/80 px-4 py-4 shadow-[0_12px_30px_rgba(27,22,16,0.05)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8A7351]">Attention Required</p>
                    <h2 className="mt-1 text-[17px] font-semibold text-[#17130F]">
                      {unresolvedItemsState[0]?.title ?? 'No project is blocked.'}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSheet({ type: 'unresolved' })}
                    className="rounded-full bg-[#17130F] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#F7E8C2]"
                  >
                    Review
                  </button>
                </div>
                <p className="mt-2 text-[12px] leading-relaxed text-[#6B5D4B]">
                  {unresolvedItemsState[0]
                    ? `${unresolvedItemsState[0].operation ?? 'This project'} is the first attention point.`
                    : 'Projects, files, people, and readiness are aligned enough to stay in motion.'}
                </p>
              </section>
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
              workspaceId={workspaceId}
              proofMode={proofMode}
            />
          )}

          {tab === 'calendar' && (
            <OperationalCalendar
              events={calendarEvents}
              baseDate={calendarBaseDate}
              onOpenVoice={() => openVoice(user?.name)}
              diagnosticState={vm.diagnosticState}
              lastHydratedAt={vm.hydration?.lastHydratedAt}
              proofMode={proofMode}
            />
          )}

          {tab === 'profile' && (
            <div className="px-5 pt-14">
              <WorkspaceSwitcher
                currentShowTelaId={showTelaId}
                currentShowTelaName={showTelaName}
                activeShowTelas={activeShowTelas}
              />
              <div className="rounded-[28px] border border-[#E2D7C7] bg-[linear-gradient(180deg,#FFFFFF_0%,#F3EDE3_100%)] px-5 py-6 shadow-[0_12px_30px_rgba(17,17,17,0.06)]">
                <div className="flex flex-col items-center">
                  <div className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-[#CFB889] bg-stone-800">
                    {user?.image ? (
                      <Image src={user.image} alt={user.name} fill sizes="80px" className="object-cover" unoptimized />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-yellow-200">{user?.name?.slice(0, 1) ?? 'S'}</div>
                    )}
                    <button onClick={() => openVoice(user?.name)} className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-stone-900">
                      <span className="text-base font-bold text-white">+</span>
                    </button>
                  </div>
                  <h2 className="mt-3 text-xl font-semibold text-stone-900">{user?.name ?? 'Operator'}</h2>
                  <p className="text-sm text-stone-500">Personal update hub</p>
                  <p className="mt-2 text-center text-[13px] leading-relaxed text-[#6B5D4B]">Use this screen to add notes, voice, files, and personal context without opening settings.</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button onClick={() => openVoice(user?.name)} className="rounded-[22px] bg-[#171411] px-4 py-4 text-left text-[#F6EFDF] shadow-[0_12px_24px_rgba(17,17,17,0.14)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#D7BC7F]">Voice</p>
                  <p className="mt-2 text-[15px] font-semibold">Voice Note</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-[#DDD1BB]">Capture a spoken update and keep the thread intact.</p>
                </button>
                <button onClick={() => openIngest('quick-update')} className="rounded-[22px] bg-white px-4 py-4 text-left shadow-[0_12px_24px_rgba(17,17,17,0.06)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9A7C46]">Update</p>
                  <p className="mt-2 text-[15px] font-semibold text-[#171411]">Quick Contribution</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-[#6B5D4B]">Log notes, blockers, and movement from your side of the field.</p>
                </button>
                <button onClick={() => openIngest('upload-files')} className="rounded-[22px] bg-white px-4 py-4 text-left shadow-[0_12px_24px_rgba(17,17,17,0.06)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9A7C46]">Files</p>
                  <p className="mt-2 text-[15px] font-semibold text-[#171411]">Uploads</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-[#6B5D4B]">Add files and photos with their source attached.</p>
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
          <PersonSheet open={sheet?.type === 'person'} name={sheet?.type === 'person' ? sheet.name : ''} role={sheet?.type === 'person' ? sheet.role : undefined} workspaceId={workspaceId} proofMode={proofMode} onClose={() => setSheet(null)} />
          <FeedSheet open={sheet?.type === 'feed'} item={sheet?.type === 'feed' ? sheet.item : null} onClose={() => setSheet(null)} />
          <OperationSheet open={sheet?.type === 'operation'} name={sheet?.type === 'operation' ? sheet.name : ''} onClose={() => setSheet(null)} onResolve={handleResolveOperation} />
          <UnresolvedSheet open={sheet?.type === 'unresolved'} items={unresolvedItemsState} onClose={() => setSheet(null)} />
          <BottomSheet open={sheet?.type === 'why'} title={sheet?.type === 'why' ? sheet.title : 'Why this matters'} onClose={() => setSheet(null)}>
            {sheet?.type === 'why' && <TELAwhyCard why={sheet.why} />}
          </BottomSheet>
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
          Syncing updates
        </div>
      )}
    </main>
  )
}
