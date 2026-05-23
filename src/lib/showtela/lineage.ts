import type { CalendarDayState, ContinuityState, OperationalCalendarEvent } from './calendar'
import type { OperationalDependency } from './reasoning'
import { deriveDependencies } from './reasoning'

export type OperationalChangeType =
  | 'created'
  | 'updated'
  | 'resolved'
  | 'escalated'
  | 'blocked'
  | 'delayed'
  | 'reassigned'
  | 'stale'

export type ContinuityImpactLevel = 'minimal' | 'moderate' | 'significant' | 'critical'

export type OperationalMemoryState = 'stable' | 'shifting' | 'drifting' | 'volatile'

export interface OperationalLineageEvent {
  id: string
  timestamp: string
  eventType: OperationalChangeType
  sourceEntity: string
  affectedDepartment: string
  previousState: CalendarDayState | ContinuityState | 'unknown'
  nextState: CalendarDayState | ContinuityState
  unresolvedDelta: number
  continuityImpact: ContinuityImpactLevel
  operationalReason: string
  actorPlaceholder: string
  linkedDependencies: string[]
  lineageSummary: string
}

export interface OperationalStateTransition {
  id: string
  eventId: string
  beforeState: CalendarDayState | ContinuityState | 'unknown'
  afterState: CalendarDayState | ContinuityState
  transitionReason: string
  pressureShift: number
  continuityShift: number
  operationalEffect: string
}

export interface PressureEvolutionAnalysis {
  dayKey: string
  initialPressure: CalendarDayState
  currentPressure: CalendarDayState
  escalationDrivers: string[]
  dependencyImpact: string[]
  unresolvedTrend: number
  continuityDrift: ContinuityState
  operationalSummary: string
}

export interface ContinuityMemorySummary {
  memoryState: OperationalMemoryState
  recentShifts: OperationalLineageEvent[]
  escalationHistory: OperationalLineageEvent[]
  stabilizationPatterns: OperationalLineageEvent[]
  repeatedUnresolvedAreas: string[]
  continuityMovement: string
  operationalVolatility: string
  mostVolatileOperationalArea?: string
  mostEscalatedDependency?: OperationalDependency
}

function dayKeyFor(value: string) {
  return value.slice(0, 10)
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
}

function eventTime(event: OperationalCalendarEvent) {
  return new Date(event.timestamp).getTime()
}

function departmentsFor(event: OperationalCalendarEvent) {
  return event.departments.length ? event.departments : [event.type]
}

function firstDepartment(event: OperationalCalendarEvent) {
  return departmentsFor(event)[0] ?? 'operations'
}

function stateWeight(state: CalendarDayState) {
  if (state === 'critical') return 6
  if (state === 'needs_decision') return 5
  if (state === 'pressure') return 4
  if (state === 'tela_ready' || state === 'waiting') return 3
  if (state === 'active') return 2
  return 1
}

function previousPressureWeight(state: CalendarDayState | ContinuityState | 'unknown') {
  if (state === 'aging') return 2
  if (state === 'stale') return 4
  if (state === 'fresh' || state === 'unknown') return 1
  return stateWeight(state)
}

function continuityWeight(state: ContinuityState) {
  if (state === 'stale') return 4
  if (state === 'aging') return 3
  if (state === 'unknown') return 2
  return 1
}

function pressureFromScore(score: number): CalendarDayState {
  if (score >= 10) return 'critical'
  if (score >= 7) return 'needs_decision'
  if (score >= 4) return 'pressure'
  if (score >= 2) return 'active'
  return 'calm'
}

function continuityFromScore(score: number): ContinuityState {
  if (score >= 8) return 'stale'
  if (score >= 4) return 'aging'
  if (score > 0) return 'fresh'
  return 'unknown'
}

function impactFromEvent(event: OperationalCalendarEvent, dependencies: OperationalDependency[]): ContinuityImpactLevel {
  const linked = dependencies.filter((dependency) => dependency.sourceEventId === event.id || dependency.targetEventId === event.id)
  const score =
    event.unresolvedCount +
    stateWeight(event.pressureState) +
    continuityWeight(event.continuityState) +
    linked.reduce((total, dependency) => total + dependency.unresolvedImpact, 0)

  if (score >= 12) return 'critical'
  if (score >= 8) return 'significant'
  if (score >= 4) return 'moderate'
  return 'minimal'
}

function changeTypeFor(event: OperationalCalendarEvent, dependencies: OperationalDependency[]): OperationalChangeType {
  if (event.pressureState === 'critical') return 'blocked'
  if (event.unresolvedCount > 0 && ['pressure', 'needs_decision', 'tela_ready'].includes(event.pressureState)) return 'escalated'
  if (event.continuityState === 'stale') return 'stale'
  if (event.pressureState === 'waiting' || event.people.length === 0) return 'delayed'
  if (dependencies.some((dependency) => dependency.targetEventId === event.id && dependency.status !== 'clear')) return 'updated'
  if (event.unresolvedCount === 0 && event.continuityState === 'fresh') return 'resolved'
  return 'created'
}

function previousStateFor(event: OperationalCalendarEvent): CalendarDayState | ContinuityState | 'unknown' {
  if (event.continuityState === 'stale') return 'aging'
  if (event.continuityState === 'aging') return 'fresh'
  if (event.pressureState === 'critical') return 'pressure'
  if (event.pressureState === 'needs_decision') return 'pressure'
  if (event.pressureState === 'pressure') return 'active'
  if (event.pressureState === 'tela_ready') return 'waiting'
  return 'unknown'
}

function linkedDependencyIds(event: OperationalCalendarEvent, dependencies: OperationalDependency[]) {
  return dependencies
    .filter((dependency) => dependency.sourceEventId === event.id || dependency.targetEventId === event.id)
    .map((dependency) => dependency.id)
}

export function detectPressureEscalation(events: OperationalCalendarEvent[]) {
  return events.filter((event) => event.unresolvedCount > 0 || stateWeight(event.pressureState) >= stateWeight('pressure'))
}

export function detectOperationalRegression(events: OperationalCalendarEvent[]) {
  return events.filter((event) => event.continuityState === 'stale' || event.people.length === 0 || event.pressureState === 'waiting')
}

export function detectRepeatedFailures(events: OperationalCalendarEvent[]) {
  const counts = new Map<string, number>()

  for (const event of events) {
    if (event.unresolvedCount === 0 && event.continuityState !== 'stale') continue
    for (const department of departmentsFor(event)) {
      counts.set(department, (counts.get(department) ?? 0) + event.unresolvedCount + (event.continuityState === 'stale' ? 2 : 1))
    }
  }

  return [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([department]) => department)
}

export function detectContinuityShifts(events: OperationalCalendarEvent[]) {
  return [...events]
    .filter((event) => event.continuityState !== 'fresh' || event.unresolvedCount > 0)
    .sort((a, b) => continuityWeight(b.continuityState) - continuityWeight(a.continuityState) || b.unresolvedCount - a.unresolvedCount)
}

export function deriveOperationalLineage(
  events: OperationalCalendarEvent[],
  dependencies = deriveDependencies(events),
): OperationalLineageEvent[] {
  return [...events]
    .sort((a, b) => eventTime(b) - eventTime(a))
    .map((event) => {
      const eventType = changeTypeFor(event, dependencies)
      const linkedDependencies = linkedDependencyIds(event, dependencies)
      const affectedDepartment = firstDepartment(event)
      const continuityImpact = impactFromEvent(event, dependencies)
      const previousState = previousStateFor(event)
      const nextState = event.continuityState === 'stale' || event.continuityState === 'aging' ? event.continuityState : event.pressureState
      const unresolvedDelta = event.unresolvedCount

      return {
        id: `lineage-${event.id}`,
        timestamp: event.timestamp,
        eventType,
        sourceEntity: event.sourceEntityId ?? event.id,
        affectedDepartment,
        previousState,
        nextState,
        unresolvedDelta,
        continuityImpact,
        operationalReason:
          eventType === 'blocked'
            ? `${event.title} is carrying blocker-level pressure.`
            : eventType === 'escalated'
              ? `${event.title} escalated through unresolved pressure and ${event.pressureState} state.`
              : eventType === 'stale'
                ? `${event.title} has stale continuity attached to the operating picture.`
                : eventType === 'delayed'
                  ? `${event.title} is delayed by ownership, waiting state, or missing people context.`
                  : eventType === 'resolved'
                    ? `${event.title} is currently fresh with no unresolved count derived.`
                    : `${event.title} entered the operational memory from ${event.source} runtime state.`,
        actorPlaceholder: event.people[0] ?? 'Runtime-derived actor pending',
        linkedDependencies,
        lineageSummary: `${affectedDepartment} moved from ${previousState} toward ${nextState} with ${unresolvedDelta} unresolved signal${unresolvedDelta === 1 ? '' : 's'}.`,
      }
    })
}

export function deriveStateTransitions(events: OperationalCalendarEvent[]): OperationalStateTransition[] {
  return [...events]
    .sort((a, b) => eventTime(b) - eventTime(a))
    .map((event) => {
      const beforeState = previousStateFor(event)
      const afterState = event.pressureState
      const pressureShift = Math.max(0, stateWeight(afterState) - previousPressureWeight(beforeState))
      const continuityShift = continuityWeight(event.continuityState) - (event.continuityState === 'fresh' ? 1 : Math.max(1, continuityWeight(event.continuityState) - 1))

      return {
        id: `transition-${event.id}`,
        eventId: event.id,
        beforeState,
        afterState,
        transitionReason:
          event.unresolvedCount > 0
            ? `${event.unresolvedCount} unresolved signal${event.unresolvedCount === 1 ? '' : 's'} kept this state moving.`
            : event.continuityState === 'fresh'
              ? 'Fresh continuity stabilized the current state.'
              : 'Runtime state changed through derived continuity movement.',
        pressureShift,
        continuityShift,
        operationalEffect:
          event.unresolvedCount > 0
            ? 'Unresolved pressure remains visible in the operating picture.'
            : event.continuityState === 'stale'
              ? 'Continuity decay is now part of the operational memory.'
              : 'The event remains available as a stable continuity marker.',
      }
    })
}

export function derivePressureEvolution(
  events: OperationalCalendarEvent[],
  dayKey: string,
  dependencies = deriveDependencies(events),
): PressureEvolutionAnalysis {
  const dayEvents = events.filter((event) => dayKeyFor(event.timestamp) === dayKey).sort((a, b) => eventTime(a) - eventTime(b))
  const initial = dayEvents[0]
  const initialPressure = initial?.pressureState ?? 'calm'
  const unresolvedTrend = dayEvents.reduce((total, event) => total + event.unresolvedCount, 0)
  const continuityScore = dayEvents.reduce((total, event) => total + continuityWeight(event.continuityState), 0)
  const pressureScore = dayEvents.reduce((total, event) => total + stateWeight(event.pressureState) + event.unresolvedCount, 0)
  const currentPressure = pressureFromScore(pressureScore)
  const continuityDrift = continuityFromScore(continuityScore)
  const dayEventIds = new Set(dayEvents.map((event) => event.id))
  const impactedDependencies = dependencies.filter((dependency) => dayEventIds.has(dependency.sourceEventId) || dayEventIds.has(dependency.targetEventId))
  const escalationDrivers = unique(
    dayEvents
      .filter((event) => event.unresolvedCount > 0 || event.continuityState === 'stale' || stateWeight(event.pressureState) >= stateWeight('pressure'))
      .map((event) => event.title),
  ).slice(0, 4)

  return {
    dayKey,
    initialPressure,
    currentPressure,
    escalationDrivers,
    dependencyImpact: impactedDependencies.map((dependency) => dependency.department).slice(0, 4),
    unresolvedTrend,
    continuityDrift,
    operationalSummary:
      dayEvents.length === 0
        ? 'No day-specific memory has been derived yet.'
        : currentPressure === 'critical'
          ? 'Pressure moved into critical territory through unresolved accumulation and dependency impact.'
          : stateWeight(currentPressure) > stateWeight(initialPressure)
            ? 'Pressure increased across the day from derived unresolved and continuity signals.'
            : unresolvedTrend > 0
              ? 'Pressure is holding because unresolved state remains attached to the day.'
              : 'The day is currently stable in operational memory.',
  }
}

export function getMostVolatileOperationalArea(events: OperationalCalendarEvent[]) {
  const scores = new Map<string, number>()

  for (const event of events) {
    for (const department of departmentsFor(event)) {
      scores.set(
        department,
        (scores.get(department) ?? 0) + stateWeight(event.pressureState) + continuityWeight(event.continuityState) + event.unresolvedCount,
      )
    }
  }

  return [...scores.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
}

export function getMostEscalatedDependency(dependencies: OperationalDependency[]) {
  return [...dependencies].sort((a, b) => b.unresolvedImpact - a.unresolvedImpact)[0]
}

function memoryStateFor(lineage: OperationalLineageEvent[], repeatedUnresolvedAreas: string[]): OperationalMemoryState {
  const critical = lineage.filter((event) => event.continuityImpact === 'critical').length
  const escalation = lineage.filter((event) => event.eventType === 'escalated' || event.eventType === 'blocked').length
  if (critical > 0 || escalation >= 3) return 'volatile'
  if (repeatedUnresolvedAreas.length > 0 || escalation > 0) return 'drifting'
  if (lineage.some((event) => event.eventType === 'updated' || event.eventType === 'stale')) return 'shifting'
  return 'stable'
}

export function buildContinuityMemory(
  events: OperationalCalendarEvent[],
  dependencies = deriveDependencies(events),
): ContinuityMemorySummary {
  const lineage = deriveOperationalLineage(events, dependencies)
  const repeatedUnresolvedAreas = detectRepeatedFailures(events)
  const memoryState = memoryStateFor(lineage, repeatedUnresolvedAreas)
  const mostVolatileOperationalArea = getMostVolatileOperationalArea(events)
  const mostEscalatedDependency = getMostEscalatedDependency(dependencies)
  const escalationHistory = lineage.filter((event) => event.eventType === 'escalated' || event.eventType === 'blocked').slice(0, 4)
  const stabilizationPatterns = lineage.filter((event) => event.eventType === 'resolved' || event.continuityImpact === 'minimal').slice(0, 3)

  return {
    memoryState,
    recentShifts: lineage.slice(0, 5),
    escalationHistory,
    stabilizationPatterns,
    repeatedUnresolvedAreas,
    continuityMovement:
      memoryState === 'volatile'
        ? 'Operational memory is volatile because escalation and continuity impact are clustering.'
        : memoryState === 'drifting'
          ? 'Continuity is drifting through repeated unresolved areas or active escalation.'
          : memoryState === 'shifting'
            ? 'Continuity is shifting but not yet volatile.'
            : 'Continuity memory is stable from the current derived sequence.',
    operationalVolatility: mostVolatileOperationalArea
      ? `${mostVolatileOperationalArea} is the most volatile derived area.`
      : 'No volatile operational area has been derived yet.',
    mostVolatileOperationalArea,
    mostEscalatedDependency,
  }
}
