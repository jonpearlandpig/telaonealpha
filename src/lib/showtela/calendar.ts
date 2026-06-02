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

export type OperationalCalendarSource = 'manual' | 'notion' | 'google' | 'tela' | 'system' | 'artifact'

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
  sourceArtifactId?: string
  sourceArtifactTitle?: string
  importedAt?: string
  freshnessTimestamp?: string
  continuityEventId?: string
  lineage?: {
    originatingArtifactId?: string
    originatingArtifactTitle?: string
    continuityEventId?: string
    importTimestamp?: string
    freshnessTimestamp?: string
  }
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

function deriveDensity(count: number): OperationalDensity {
  if (count >= 5) return 'heavy'
  if (count >= 2) return 'moderate'
  return 'light'
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
