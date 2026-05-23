export type CalendarDayState =
  | 'calm'
  | 'active'
  | 'pressure'
  | 'critical'
  | 'waiting'
  | 'needs_decision'
  | 'tela_ready'

export type OperationalDensity = 'light' | 'moderate' | 'heavy'

export type ContinuityState = 'fresh' | 'aging' | 'stale' | 'unknown'

export type OperationalCalendarEventType =
  | 'meeting'
  | 'show'
  | 'travel'
  | 'venue'
  | 'production'
  | 'hospitality'
  | 'staffing'
  | 'deadline'
  | 'note'

export type OperationalCalendarSource = 'manual' | 'notion' | 'google' | 'tela' | 'system'

export interface OperationalCalendarEvent {
  id: string
  title: string
  type: OperationalCalendarEventType
  status: CalendarDayState
  source: OperationalCalendarSource
  timestamp: string
  startTime?: string
  endTime?: string
  people: string[]
  departments: string[]
  location?: string
  summary?: string
  unresolvedCount: number
  pressureState: CalendarDayState
  continuityState: ContinuityState
  density: OperationalDensity
  telaHint?: string
  lineagePlaceholder?: string
  sourceEntityId?: string
}

export interface OperationalWeekDay {
  key: string
  label: string
  dateLabel: string
  fullLabel: string
  isToday: boolean
  events: OperationalCalendarEvent[]
  state: CalendarDayState
  density: OperationalDensity
  unresolvedCount: number
  nextEvent?: OperationalCalendarEvent
  continuityState: ContinuityState
}

type FeedLike = {
  id: string
  headline?: string
  title?: string
  body?: string
  summary?: string
  timestamp?: string
  pressure?: string
  owner?: { name?: string } | string
  tags?: string[]
  linkedEntities?: string[]
  unresolvedDependencies?: string[]
  unresolvedMarkers?: string[]
  isNew?: boolean
}

type OperationLike = {
  id: string
  name?: string
  label?: string
  latest?: string
  unresolvedCount?: number
}

type UnresolvedLike = {
  id: string
  title: string
  severity?: string
  blocking?: boolean
  operation?: string
  aging?: number
  owner?: string
}

type TimelineLike = {
  id: string
  timestamp: string
  actor?: string
  summary: string
  continuityObjectId?: string
  pressureDelta?: number
}

export type BuildOperationalCalendarEventsInput = {
  feed: FeedLike[]
  operations: OperationLike[]
  unresolvedItems: UnresolvedLike[]
  runtimeTimeline?: TimelineLike[]
  people?: string[]
  source?: 'supabase' | 'notion' | 'empty'
  baseDate?: Date
}

function isValidDate(value?: string) {
  return Boolean(value && !Number.isNaN(new Date(value).getTime()))
}

function toDayKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function dayStart(date: Date) {
  const next = new Date(date)
  next.setHours(9, 0, 0, 0)
  return next
}

function normalizeState(value?: string): CalendarDayState {
  const lower = (value ?? '').toLowerCase()
  if (lower === 'critical' || lower === 'high') return 'critical'
  if (lower === 'pressure' || lower === 'medium') return 'pressure'
  if (lower === 'waiting') return 'waiting'
  if (lower === 'needs_decision') return 'needs_decision'
  if (lower === 'tela_ready') return 'tela_ready'
  if (lower === 'active' || lower === 'low') return 'active'
  return 'calm'
}

function sourceFromRuntime(source?: 'supabase' | 'notion' | 'empty'): OperationalCalendarSource {
  if (source === 'notion') return 'notion'
  return 'system'
}

function deriveDensity(count: number): OperationalDensity {
  if (count >= 5) return 'heavy'
  if (count >= 2) return 'moderate'
  return 'light'
}

function deriveContinuityState(timestamp?: string, baseDate = new Date()): ContinuityState {
  if (!isValidDate(timestamp)) return 'unknown'
  const ageMs = baseDate.getTime() - new Date(timestamp!).getTime()
  const ageDays = ageMs / 86_400_000
  if (ageDays <= 1) return 'fresh'
  if (ageDays <= 3) return 'aging'
  return 'stale'
}

function departmentFromText(value: string): OperationalCalendarEventType {
  const text = value.toLowerCase()
  if (text.includes('venue')) return 'venue'
  if (text.includes('travel') || text.includes('transport')) return 'travel'
  if (text.includes('hospitality') || text.includes('hotel')) return 'hospitality'
  if (text.includes('staff') || text.includes('crew')) return 'staffing'
  if (text.includes('production') || text.includes('call sheet')) return 'production'
  if (text.includes('show')) return 'show'
  return 'note'
}

function ownerName(owner: FeedLike['owner']) {
  if (!owner) return undefined
  return typeof owner === 'string' ? owner : owner.name
}

function unique(values: Array<string | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean) as string[]))
}

export function formatOperationalTime(value?: string) {
  if (!isValidDate(value)) return 'Time open'
  return new Date(value!).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace(' AM', 'A').replace(' PM', 'P')
}

export function getWeekDays(baseDate = new Date(), events: OperationalCalendarEvent[] = []): OperationalWeekDay[] {
  const start = new Date(baseDate)
  start.setHours(0, 0, 0, 0)
  const todayKey = toDayKey(start)
  const grouped = groupEventsByDay(events)

  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index)
    const key = toDayKey(date)
    const dayEvents = grouped[key] ?? []
    return {
      key,
      label: date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
      dateLabel: date.toLocaleDateString('en-US', { day: 'numeric' }),
      fullLabel: date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
      isToday: key === todayKey,
      events: dayEvents,
      state: deriveDayState(dayEvents),
      density: deriveDensity(dayEvents.length),
      unresolvedCount: getUnresolvedCount(dayEvents),
      nextEvent: getNextKeyEvent(dayEvents),
      continuityState: deriveDayContinuityState(dayEvents),
    }
  })
}

export function groupEventsByDay(events: OperationalCalendarEvent[]) {
  return events.reduce<Record<string, OperationalCalendarEvent[]>>((acc, event) => {
    const key = toDayKey(new Date(event.timestamp))
    acc[key] = [...(acc[key] ?? []), event].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    return acc
  }, {})
}

export function deriveDayState(events: OperationalCalendarEvent[]): CalendarDayState {
  if (events.some((event) => event.pressureState === 'critical')) return 'critical'
  if (events.some((event) => event.pressureState === 'needs_decision')) return 'needs_decision'
  if (events.some((event) => event.pressureState === 'tela_ready')) return 'tela_ready'
  if (events.some((event) => event.pressureState === 'pressure')) return 'pressure'
  if (events.some((event) => event.pressureState === 'waiting')) return 'waiting'
  if (events.length > 0) return 'active'
  return 'calm'
}

export function getNextKeyEvent(events: OperationalCalendarEvent[]) {
  return [...events].sort((a, b) => {
    const score = (event: OperationalCalendarEvent) =>
      (event.pressureState === 'critical' ? 4 : event.pressureState === 'needs_decision' ? 3 : event.pressureState === 'pressure' ? 2 : 1) * 10000000000000 -
      new Date(event.timestamp).getTime()
    return score(b) - score(a)
  })[0]
}

export function getUnresolvedCount(events: OperationalCalendarEvent[]) {
  return events.reduce((total, event) => total + event.unresolvedCount, 0)
}

function deriveDayContinuityState(events: OperationalCalendarEvent[]): ContinuityState {
  if (events.length === 0) return 'unknown'
  if (events.some((event) => event.continuityState === 'stale')) return 'stale'
  if (events.some((event) => event.continuityState === 'aging')) return 'aging'
  if (events.some((event) => event.continuityState === 'fresh')) return 'fresh'
  return 'unknown'
}

export function buildOperationalCalendarEvents({
  feed,
  operations,
  unresolvedItems,
  runtimeTimeline = [],
  people = [],
  source,
  baseDate,
}: BuildOperationalCalendarEventsInput): OperationalCalendarEvent[] {
  const anchorDate = baseDate ?? new Date()
  const runtimeSource = sourceFromRuntime(source)

  const feedEvents = feed
    .filter((item) => isValidDate(item.timestamp))
    .map<OperationalCalendarEvent>((item) => {
      const title = item.headline ?? item.title ?? 'Continuity movement'
      const linked = item.tags ?? item.linkedEntities ?? []
      const unresolvedCount = (item.unresolvedDependencies?.length ?? 0) + (item.unresolvedMarkers?.length ?? 0) + (item.isNew ? 1 : 0)
      const status = unresolvedCount > 0 ? 'tela_ready' : normalizeState(item.pressure)
      return {
        id: `feed-${item.id}`,
        title,
        type: departmentFromText(`${title} ${(item.body ?? item.summary ?? '')} ${linked.join(' ')}`),
        status,
        source: runtimeSource,
        timestamp: item.timestamp!,
        startTime: item.timestamp,
        people: unique([ownerName(item.owner), ...people.filter((name) => title.toLowerCase().includes(name.toLowerCase()))]),
        departments: unique(linked),
        summary: item.body ?? item.summary,
        unresolvedCount,
        pressureState: status,
        continuityState: deriveContinuityState(item.timestamp, anchorDate),
        density: deriveDensity(unresolvedCount + 1),
        telaHint: unresolvedCount > 0 ? 'TELA can trace the unresolved continuity behind this movement.' : 'TELA can summarize why this movement matters now.',
        lineagePlaceholder: `Continuity lineage prepared from ${item.id}`,
        sourceEntityId: item.id,
      }
    })

  const timelineEvents = runtimeTimeline
    .filter((item) => isValidDate(item.timestamp))
    .map<OperationalCalendarEvent>((item) => {
      const status = (item.pressureDelta ?? 0) > 0 ? 'pressure' : 'active'
      return {
        id: `timeline-${item.id}`,
        title: item.summary,
        type: departmentFromText(item.summary),
        status,
        source: 'system',
        timestamp: item.timestamp,
        startTime: item.timestamp,
        people: unique([item.actor]),
        departments: [],
        summary: item.summary,
        unresolvedCount: (item.pressureDelta ?? 0) > 0 ? 1 : 0,
        pressureState: status,
        continuityState: deriveContinuityState(item.timestamp, anchorDate),
        density: 'light',
        telaHint: 'TELA can explain the causal movement behind this timeline change.',
        lineagePlaceholder: item.continuityObjectId ? `Runtime lineage prepared from ${item.continuityObjectId}` : 'Runtime lineage placeholder ready.',
        sourceEntityId: item.continuityObjectId ?? item.id,
      }
    })

  const unresolvedEvents = unresolvedItems.map<OperationalCalendarEvent>((item, index) => {
    const timestamp = dayStart(addDays(anchorDate, Math.min(index, 6))).toISOString()
    const status: CalendarDayState = item.blocking ? 'critical' : item.severity === 'high' ? 'needs_decision' : 'pressure'
    const department = item.operation ?? 'Unassigned operation'
    return {
      id: `unresolved-${item.id}`,
      title: item.title,
      type: departmentFromText(`${department} ${item.title}`) === 'note' ? 'deadline' : departmentFromText(`${department} ${item.title}`),
      status,
      source: 'system',
      timestamp,
      startTime: timestamp,
      people: unique([item.owner]),
      departments: unique([department]),
      summary: item.operation ? `${item.operation} is carrying unresolved pressure.` : 'Unresolved operational item is waiting for assignment.',
      unresolvedCount: 1,
      pressureState: status,
      continuityState: typeof item.aging === 'number' ? (item.aging >= 4 ? 'stale' : item.aging >= 2 ? 'aging' : 'fresh') : 'unknown',
      density: 'light',
      telaHint: item.blocking ? 'TELA can explain why this blocker matters next.' : 'TELA can prepare the next clarifying move.',
      lineagePlaceholder: `Unresolved lineage placeholder prepared from ${item.id}`,
      sourceEntityId: item.id,
    }
  })

  const operationEvents = operations
    .filter((item) => (item.unresolvedCount ?? 0) > 0 || Boolean(item.latest))
    .map<OperationalCalendarEvent>((item, index) => {
      const unresolvedCount = item.unresolvedCount ?? 0
      const timestamp = dayStart(addDays(anchorDate, Math.min(index, 6))).toISOString()
      const title = item.label ?? item.name ?? 'Operation'
      const status: CalendarDayState = unresolvedCount >= 3 ? 'pressure' : unresolvedCount > 0 ? 'active' : 'calm'
      return {
        id: `operation-${item.id}`,
        title,
        type: departmentFromText(`${title} ${item.latest ?? ''}`),
        status,
        source: 'system',
        timestamp,
        startTime: timestamp,
        people: [],
        departments: unique([title]),
        summary: item.latest || `${title} is present in the operational field.`,
        unresolvedCount,
        pressureState: status,
        continuityState: item.latest ? 'fresh' : 'unknown',
        density: deriveDensity(unresolvedCount),
        telaHint: unresolvedCount > 0 ? 'TELA can map the open dependencies for this operation.' : 'TELA can keep this operation available in time context.',
        lineagePlaceholder: `Operation lineage placeholder prepared from ${item.id}`,
        sourceEntityId: item.id,
      }
    })

  return [...feedEvents, ...timelineEvents, ...unresolvedEvents, ...operationEvents]
}
