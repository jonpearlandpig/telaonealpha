import type { ArtifactRecord } from '@/lib/artifacts/artifactStore'
import { parseMarkdownCalendar } from '@/lib/continuity/parseMarkdownCalendar'
import { parseMarkdownDirectory } from '@/lib/continuity/parseMarkdownDirectory'
import type { ShowTelaHydrationSummary, ShowTelaRuntimeSnapshotMeta } from './types'
import type { OperationalCalendarEvent } from './calendar'
import type {
  FeedItem,
  OperationEntity,
  PersonItem,
  ShowTelaViewModel,
  UnresolvedItem,
  UnresolvedPressure,
} from '@/components/showtela/types'
import type { HydratedRuntimeState } from '@/lib/runtime/runtimeHydrationModel'

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

type ArtifactKind = 'directory' | 'calendar' | 'rider' | 'generic'
type RiderRequirement = {
  id: string
  title: string
  detail: string
  department: string
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

function parseMarkdownRider(text: string): {
  title: string
  departments: string[]
  requirements: RiderRequirement[]
} {
  const lines = text.split('\n')
  const departments: string[] = []
  const requirements: RiderRequirement[] = []
  let title = ''
  let currentDepartment = ''

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    if (trimmed.startsWith('# ')) {
      if (!title) {
        title = trimmed.slice(2).trim()
        if (title && !departments.includes(title)) departments.push(title)
      }
      continue
    }

    if (/^#{2,3}\s/.test(trimmed)) {
      currentDepartment = trimmed
        .replace(/^#+\s+/, '')
        .replace(/\s+DEPARTMENT$/i, '')
        .trim()
      if (currentDepartment && !departments.includes(currentDepartment)) departments.push(currentDepartment)
      continue
    }

    if (!currentDepartment || (!trimmed.startsWith('- ') && !trimmed.startsWith('* '))) continue

    const content = trimmed.slice(2).trim()
    const separators = [' — ', ' – ', ' - ', ': ']
    let requirementTitle = content
    let requirementDetail = ''

    for (const separator of separators) {
      const index = content.indexOf(separator)
      if (index > 0) {
        requirementTitle = content.slice(0, index).trim()
        requirementDetail = content.slice(index + separator.length).trim()
        break
      }
    }

    requirements.push({
      id: `rider:${slugify(`${currentDepartment}-${requirementTitle}`)}`,
      title: requirementTitle,
      detail: requirementDetail,
      department: currentDepartment,
    })
  }

  return {
    title: title || 'Production Rider',
    departments,
    requirements,
  }
}

function collectArtifactViewData(artifacts: ArtifactRecord[]) {
  const people = new Map<string, PersonItem>()
  const operations = new Map<string, OperationEntity>()
  const feed = new Map<string, FeedItem>()
  const calendarEvents = new Map<string, OperationalCalendarEvent>()

  for (const artifact of artifacts.sort((left, right) => left.createdAt.localeCompare(right.createdAt))) {
    const text = artifact.text ?? ''
    const directory = parseMarkdownDirectory(text)
    const calendar = parseMarkdownCalendar(text)
    const rider = parseMarkdownRider(text)
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

    if (calendar.events.length > 0) {
      for (const department of calendar.departments) {
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

    for (const event of calendar.events) {
      calendarEvents.set(event.id, {
        id: event.id,
        title: event.title,
        type: 'show',
        status: 'active',
        source: 'system',
        timestamp: event.isoTimestamp,
        startTime: event.isoTimestamp,
        people: event.owner ? [event.owner] : [],
        departments: [event.department],
        location: event.location,
        summary: event.location ? `${event.department} · ${event.location}` : event.department,
        unresolvedCount: 0,
        pressureState: 'active',
        continuityState: 'fresh',
        density: 'light',
        telaHint: 'Uploaded calendar row now drives the visible field.',
        lineagePlaceholder: artifact.id,
        sourceEntityId: artifact.id,
      })
      feed.set(`feed:${event.id}`, {
        id: `feed:${event.id}`,
        timestamp: event.isoTimestamp,
        title: event.title,
        summary: event.location ? `${event.department} · ${event.location}` : event.department,
        owner: event.owner ?? '',
        image: '',
        avatar: '',
        unresolved: false,
        linkedEntities: [event.department],
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
    calendarEvents: [...calendarEvents.values()].sort((left, right) => left.timestamp.localeCompare(right.timestamp)),
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
  const artifactView = collectArtifactViewData(state.artifacts)
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
  const replayFeed: FeedItem[] = state.recentDecisions.slice(-12).map((decision, i) => ({
    id: `decision:${i}`,
    timestamp: state.diagnostics.hydratedAt,
    title: decision,
    summary: '',
    owner: '',
    image: '',
    avatar: '',
    unresolved: false,
    linkedEntities: [],
  }))
  const feed = artifactView.feed.length > 0 ? artifactView.feed : replayFeed

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
    continuityObjects: [],
    runtimeTimeline: [],
    source: 'supabase',
    diagnosticState: 'persistence-connected',
    hydration,
    runtimeSnapshotMeta,
    calendarEvents: artifactView.calendarEvents.length > 0 ? artifactView.calendarEvents : undefined,
    // operationalProjection intentionally absent — sovereign path does not inject projection into ViewModel
  }
}
