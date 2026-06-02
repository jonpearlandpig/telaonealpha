import type { ArtifactRecord } from '@/lib/artifacts/artifactStore'
import { parseMarkdownCalendar } from '@/lib/continuity/parseMarkdownCalendar'
import { parseMarkdownDirectory } from '@/lib/continuity/parseMarkdownDirectory'
import { parseMarkdownRider } from '@/lib/venue-intelligence/rider'
import type { ShowTelaHydrationSummary, ShowTelaRuntimeSnapshotMeta } from './types'
import { buildReadinessReviewsFromEvents } from './readiness'
import type {
  FeedItem,
  OperationEntity,
  PersonItem,
  ShowTelaViewModel,
  UnresolvedItem,
  UnresolvedPressure,
} from '@/components/showtela/types'
import type { HydratedRuntimeState } from '@/lib/runtime/runtimeHydrationModel'
import { SHOWTELA_CREATED_EVENT_TYPE } from './lifecycleRegistry'
import { buildShowTelaContinuityEvents } from './continuityEvents'
import { buildCanonicalCalendarEvents } from './calendarAuthority'
import { buildTELAwhyFromContinuityRecord } from './telawhy'

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function detectArtifactKind(input: {
  artifact: ArtifactRecord
  text: string
  directoryPeopleCount: number
  calendarEventCount: number
}) {
  const content = [
    input.artifact.title,
    input.artifact.fileName,
    input.text,
  ].filter(Boolean).join('\n')

  if (/production rider/i.test(content)) return 'rider' as const
  if (/\|\s*role\s*\|\s*name\s*\|/i.test(input.text) || /\|\s*name\s*\|/i.test(input.text)) return 'directory' as const
  if (input.directoryPeopleCount > 0) return 'directory' as const
  if (input.calendarEventCount > 0) return 'calendar' as const
  return 'generic' as const
}

function collectArtifactViewData(artifacts: ArtifactRecord[], calendarEvents: ReturnType<typeof buildCanonicalCalendarEvents>) {
  const people = new Map<string, PersonItem>()
  const operations = new Map<string, OperationEntity>()
  const feed = new Map<string, FeedItem>()

  for (const artifact of [...artifacts].sort((left, right) => left.createdAt.localeCompare(right.createdAt))) {
    const text = artifact.text ?? ''
    const directory = parseMarkdownDirectory(text)
    const calendar = parseMarkdownCalendar(text)
    const rider = parseMarkdownRider(text)
    const calendarEventsForArtifact = calendarEvents.filter((event) => event.sourceArtifactId === artifact.id)
    const kind = detectArtifactKind({
      artifact,
      text,
      directoryPeopleCount: directory.people.length,
      calendarEventCount: calendar.events.length,
    })

    if (kind === 'directory') {
      for (const person of directory.people) {
        if (!person.role && !person.department) continue
        const id = `person:${slugify(person.name)}`
        if (!people.has(id)) {
          people.set(id, {
            id,
            name: person.name,
            image: '',
            latest: person.role || person.department,
            unresolvedCount: 0,
          })
        }
      }
    }

    if (kind === 'directory' || kind === 'generic') {
      for (const department of directory.departments) {
        const id = `operation:${slugify(department)}`
        if (!operations.has(id)) {
          operations.set(id, {
            id,
            name: department,
            label: department,
            image: '',
            latest: artifact.title,
            unresolvedCount: 0,
          })
        }
      }
    }

    if (kind === 'rider') {
      for (const department of rider.departments) {
        const id = `operation:${slugify(department)}`
        if (!operations.has(id)) {
          operations.set(id, {
            id,
            name: department,
            label: department,
            image: '',
            latest: artifact.title,
            unresolvedCount: 0,
          })
        }
      }

      for (const requirement of rider.requirements) {
        feed.set(`rider:${requirement.id}`, {
          id: `rider:${requirement.id}`,
          timestamp: artifact.createdAt,
          title: requirement.title,
          summary: requirement.detail ? `${requirement.department} · ${requirement.detail}` : requirement.department,
          owner: '',
          image: '',
          avatar: '',
          unresolved: false,
          linkedEntities: [requirement.department],
        })
      }

      feed.set(`artifact:${artifact.id}`, {
        id: `artifact:${artifact.id}`,
        timestamp: artifact.createdAt,
        title: artifact.title,
        summary: `${rider.requirements.length} requirements uploaded`,
        owner: '',
        image: '',
        avatar: '',
        unresolved: false,
        linkedEntities: rider.departments,
      })
      continue
    }

    if (calendarEventsForArtifact.length > 0) {
      const departments = Array.from(new Set(calendarEventsForArtifact.flatMap((event) => event.departments)))
      for (const department of departments) {
        const id = `operation:${slugify(department)}`
        if (!operations.has(id)) {
          operations.set(id, {
            id,
            name: department,
            label: department,
            image: '',
            latest: artifact.title,
            unresolvedCount: 0,
          })
        }
      }
    }

    for (const event of calendarEventsForArtifact) {
      feed.set(`feed:${event.id}`, {
        id: `feed:${event.id}`,
        timestamp: event.timestamp,
        title: event.title,
        summary: event.summary ?? event.departments.join(' / '),
        owner: event.people[0] ?? '',
        image: '',
        avatar: '',
        unresolved: false,
        linkedEntities: event.departments,
      })
    }

    if (kind === 'directory' && (directory.people.length || directory.departments.length)) {
      feed.set(`artifact:${artifact.id}`, {
        id: `artifact:${artifact.id}`,
        timestamp: artifact.createdAt,
        title: artifact.title,
        summary: directory.people.length
          ? `${directory.people.length} anchors uploaded`
          : `${directory.departments.length} departments uploaded`,
        owner: '',
        image: '',
        avatar: '',
        unresolved: false,
        linkedEntities: directory.departments,
      })
    }
  }

  return {
    people: [...people.values()],
    operations: [...operations.values()],
    feed: [...feed.values()].sort((left, right) => left.timestamp.localeCompare(right.timestamp)),
  }
}

// Sovereign adapter — maps HydratedRuntimeState (event-derived runtime truth) to ShowTelaViewModel.
// This is the target path after Phase B SSR inversion. operationalProjection is never
// passed to the ViewModel from this function — the ViewModel carries display data only.
//
// Display gaps where Notion-sourced metadata is absent are intentional:
// truthful gaps > fabricated continuity.
export function buildShowTelaVMFromHydratedState(
  state: HydratedRuntimeState,
): ShowTelaViewModel {
  const replayEvents = state.events ?? []
  const createdEvent = replayEvents.find((event) => event.type === SHOWTELA_CREATED_EVENT_TYPE)
  const showTelaName = typeof createdEvent?.payload?.showTelaName === 'string' ? createdEvent.payload.showTelaName : undefined
  const showTelaId = createdEvent?.id ?? state.replay.state.activeProjects[0] ?? 'showtela'
  const continuityRecords = buildShowTelaContinuityEvents({
    showTelaId,
    showTelaName,
    runtimeEvents: replayEvents,
    artifacts: state.artifacts,
  })
  const calendarEvents = buildCanonicalCalendarEvents({
    artifacts: state.artifacts,
    continuityEvents: continuityRecords,
    hydratedAt: state.diagnostics.hydratedAt,
  })
  const artifactView = collectArtifactViewData(state.artifacts, calendarEvents)
  const artifactsById = new Map(state.artifacts.map((artifact) => [artifact.id, artifact]))
  const telaWhyByEventId = new Map(continuityRecords.map((record) => [
    record.event_id,
    buildTELAwhyFromContinuityRecord({
      record,
      artifact: record.artifact_id ? artifactsById.get(record.artifact_id) : undefined,
      hydratedAt: state.diagnostics.hydratedAt,
    }),
  ]))
  const readinessReviews = buildReadinessReviewsFromEvents(replayEvents, { showTelaId })
  const latestContinuity = continuityRecords[0]
  const showTelaStatus = continuityRecords.some((event) => event.event_type === 'SHOWTELA_ARCHIVED') ? 'archived' as const : 'active' as const
  // Person entities from the durable store, filtered to those active in replay
  const activeEntityIds = new Set(
    state.operationalObjects
      .filter(o => o.objectType === 'entity')
      .map(o => (typeof o.payload.entityId === 'string' ? o.payload.entityId : null))
      .filter((id): id is string => id !== null),
  )

  const personEntities = state.entities.filter(e => e.type === 'person')

  const replayActiveOps: PersonItem[] = personEntities
    .filter(e => activeEntityIds.has(e.id))
    .map(e => ({
      id: e.id,
      name: e.name,
      image: '',
      latest: e.type,
      unresolvedCount: e.unresolvedLinks,
    }))
  const activeOps = artifactView.people.length > 0
    ? artifactView.people
    : replayActiveOps.length > 0
      ? replayActiveOps
      : personEntities.map(e => ({
          id: e.id,
          name: e.name,
          image: '',
          latest: e.type,
          unresolvedCount: e.unresolvedLinks,
        }))

  // Operations derived from continuity-thread objects in replay
  const threadObjects = state.operationalObjects.filter(o => o.objectType === 'continuity-thread')
  const replayOperations: OperationEntity[] = threadObjects.map(o => ({
    id: o.id,
    name: typeof o.payload.threadId === 'string' ? o.payload.threadId : o.id,
    label: o.status,
    image: '',
    latest: o.updatedAt,
    unresolvedCount: 0,
  }))
  const crusadeOperations = artifactView.operations.length > 0 ? artifactView.operations : replayOperations

  // Unresolved items from replay reconstruction
  const unresolved: UnresolvedItem[] = state.unresolved.incompleteArtifacts.map(id => ({
    id: `unresolved:${id}`,
    title: id,
    severity: 'medium' as const,
  }))

  const unresolvedPressure: UnresolvedPressure = {
    unresolvedCount: state.unresolved.incompleteArtifacts.length,
    overdueCount: 0,
    blockedCount: 0,
    pendingApprovals: 0,
  }

  // Feed from recent replay decisions
  const replayFeed: FeedItem[] = continuityRecords
    .slice(0, 24)
    .map((record) => ({
      id: record.event_id,
      timestamp: record.created_at,
      title: record.title,
      summary: record.description,
      owner: record.created_by,
      image: '',
      avatar: '',
      unresolved: false,
      linkedEntities: Array.isArray(record.metadata.linked_entities)
        ? record.metadata.linked_entities.filter((item): item is string => typeof item === 'string')
        : [],
      pressure: record.event_type.includes('ARCHIVED') ? 'low' : undefined,
      telaWhy: telaWhyByEventId.get(record.event_id),
    }))
  const feed = replayFeed.length > 0 ? replayFeed : artifactView.feed

  const hydration: ShowTelaHydrationSummary = {
    connectedToNotion: false,  // hydrateRuntime() does not call Notion
    connectedToSupabase: true,
    counts: {
      people: personEntities.length,
      operations: crusadeOperations.length,
      continuity: state.operationalObjects.length,
      unresolved: state.unresolved.incompleteArtifacts.length,
      artifacts: state.artifacts.length,
    },
    lastHydratedAt: state.diagnostics.hydratedAt,
    cacheSource: 'supabase',
  }

  const latestSnapshot = state.snapshots.at(-1)
  const runtimeSnapshotMeta: ShowTelaRuntimeSnapshotMeta | undefined = latestSnapshot
    ? {
        snapshotId: latestSnapshot.id,
        workspaceId: state.replay.state.activeProjects[0] ?? 'unknown',
        updatedAt: latestSnapshot.createdAt,
        canonical: true,
        overwriteMode: 'merge',
        sourceIngest: 'continuity',
      }
    : undefined

  return {
    activeOps,
    fluencyPartners: [],  // no fluency partner classification in replay layer yet
    crusadeOperations,
    unresolvedPressure,
    unresolved,
    feed,
    continuityObjects: continuityRecords.map((record) => ({
      id: record.event_id,
      headline: record.title,
      body: record.description,
      timestamp: record.created_at,
      tags: [record.event_type],
      owner: { id: record.created_by, name: record.created_by },
      linkedEntities: Array.isArray(record.metadata.linked_entities)
        ? record.metadata.linked_entities.filter((item): item is string => typeof item === 'string')
        : [],
      sourceMode: record.source,
      telaWhy: telaWhyByEventId.get(record.event_id),
    })),
    readinessReviews,
    runtimeTimeline: continuityRecords.slice(0, 24).map((record) => ({
      id: record.event_id,
      timestamp: record.created_at,
      actor: record.created_by,
      summary: record.title,
      continuityObjectId: record.event_id,
      pressureDelta: 0,
    })),
    continuityTimeline: continuityRecords.slice(0, 24).map((record) => ({
      id: record.event_id,
      timestamp: record.created_at,
      eventType: record.event_type,
      title: record.title,
      description: record.description,
      telaWhy: telaWhyByEventId.get(record.event_id),
    })),
    showTelaHealth: {
      people: activeOps.length,
      operations: crusadeOperations.length,
      calendarEvents: calendarEvents.length,
      artifacts: state.artifacts.length,
      events: continuityRecords.length,
      lastActivityAt: latestContinuity?.created_at ?? state.replay.lastEventAt,
    },
    showTelaStatus,
    source: 'supabase',
    diagnosticState: 'persistence-connected',
    hydration,
    runtimeSnapshotMeta,
    calendarEvents,
    // operationalProjection intentionally absent — sovereign path does not inject projection into ViewModel
  }
}
