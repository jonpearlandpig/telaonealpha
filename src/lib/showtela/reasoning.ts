import type { OperationalCalendarEvent } from './calendar'

export type OperationalPressureLevel = 'low' | 'moderate' | 'high' | 'critical'

export type DependencyStatus = 'clear' | 'blocked' | 'at_risk' | 'waiting'

export type ContinuityDriftLevel = 'stable' | 'aging' | 'stale' | 'critical'

export interface OperationalDependency {
  id: string
  sourceEventId: string
  targetEventId: string
  department: string
  dependencyReason: string
  status: DependencyStatus
  unresolvedImpact: number
  operationalRisk: OperationalPressureLevel
}

export interface OperationalPressureReason {
  id: string
  category: string
  explanation: string
  severity: OperationalPressureLevel
  affectedDepartments: string[]
  unresolvedCount: number
  linkedEvents: string[]
}

export interface ContinuityDriftAnalysis {
  dayKey: string
  driftLevel: ContinuityDriftLevel
  staleItems: string[]
  untouchedAreas: string[]
  unresolvedAge: number
  missingOwnership: string[]
  operationalRiskSummary: string
}

export interface OperationalReasoningSummary {
  pressureReasons: OperationalPressureReason[]
  drift: ContinuityDriftAnalysis
  dependencies: OperationalDependency[]
  mostBlockedDepartment?: string
  highestPressureEvent?: OperationalCalendarEvent
  oldestUnresolvedItem?: OperationalCalendarEvent
  recommendedFocus: string
  keyDependency?: OperationalDependency
}

function dayKeyFor(value: string) {
  return value.slice(0, 10)
}

function pressureScore(level: OperationalPressureLevel) {
  if (level === 'critical') return 4
  if (level === 'high') return 3
  if (level === 'moderate') return 2
  return 1
}

function eventRisk(event: OperationalCalendarEvent): OperationalPressureLevel {
  if (event.pressureState === 'critical' || event.unresolvedCount >= 4) return 'critical'
  if (event.pressureState === 'needs_decision' || event.pressureState === 'pressure' || event.unresolvedCount >= 2) return 'high'
  if (event.pressureState === 'tela_ready' || event.pressureState === 'waiting' || event.unresolvedCount === 1) return 'moderate'
  return 'low'
}

function dependencyStatus(event: OperationalCalendarEvent): DependencyStatus {
  if (event.pressureState === 'critical' || event.status === 'critical') return 'blocked'
  if (event.pressureState === 'pressure' || event.pressureState === 'needs_decision') return 'at_risk'
  if (event.pressureState === 'waiting' || event.people.length === 0) return 'waiting'
  return 'clear'
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
}

function departmentsFor(event: OperationalCalendarEvent) {
  return event.departments.length ? event.departments : [event.type]
}

function eventTime(event: OperationalCalendarEvent) {
  return new Date(event.timestamp).getTime()
}

export function getHighestPressureEvent(events: OperationalCalendarEvent[]) {
  return [...events].sort((a, b) => {
    const riskDelta = pressureScore(eventRisk(b)) - pressureScore(eventRisk(a))
    if (riskDelta !== 0) return riskDelta
    const unresolvedDelta = b.unresolvedCount - a.unresolvedCount
    if (unresolvedDelta !== 0) return unresolvedDelta
    return eventTime(a) - eventTime(b)
  })[0]
}

export function getOldestUnresolvedItem(events: OperationalCalendarEvent[]) {
  return events
    .filter((event) => event.unresolvedCount > 0)
    .sort((a, b) => eventTime(a) - eventTime(b))[0]
}

export function getMostBlockedDepartment(events: OperationalCalendarEvent[]) {
  const counts = new Map<string, number>()

  for (const event of events) {
    const risk = eventRisk(event)
    const weight = risk === 'critical' ? 4 : risk === 'high' ? 3 : risk === 'moderate' ? 2 : 1
    for (const department of departmentsFor(event)) {
      counts.set(department, (counts.get(department) ?? 0) + weight + event.unresolvedCount)
    }
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
}

export function deriveOperationalPressure(events: OperationalCalendarEvent[]): OperationalPressureReason[] {
  const reasons: OperationalPressureReason[] = []
  const unresolvedEvents = events.filter((event) => event.unresolvedCount > 0)
  const criticalEvents = events.filter((event) => eventRisk(event) === 'critical')
  const waitingEvents = events.filter((event) => event.pressureState === 'waiting' || event.people.length === 0)
  const staleEvents = events.filter((event) => event.continuityState === 'stale')
  const departments = unique(events.flatMap(departmentsFor))

  if (unresolvedEvents.length > 0) {
    const unresolvedCount = unresolvedEvents.reduce((total, event) => total + event.unresolvedCount, 0)
    reasons.push({
      id: 'unresolved-pressure',
      category: 'Unresolved pressure',
      explanation: `${unresolvedCount} unresolved item${unresolvedCount === 1 ? '' : 's'} are still attached to this operational window.`,
      severity: unresolvedCount >= 4 ? 'critical' : unresolvedCount >= 2 ? 'high' : 'moderate',
      affectedDepartments: unique(unresolvedEvents.flatMap(departmentsFor)),
      unresolvedCount,
      linkedEvents: unresolvedEvents.map((event) => event.id),
    })
  }

  if (criticalEvents.length > 0) {
    reasons.push({
      id: 'critical-state',
      category: 'Critical operational state',
      explanation: `${criticalEvents.length} event${criticalEvents.length === 1 ? '' : 's'} carry critical pressure or blocker-level unresolved state.`,
      severity: 'critical',
      affectedDepartments: unique(criticalEvents.flatMap(departmentsFor)),
      unresolvedCount: criticalEvents.reduce((total, event) => total + event.unresolvedCount, 0),
      linkedEvents: criticalEvents.map((event) => event.id),
    })
  }

  if (waitingEvents.length > 0) {
    reasons.push({
      id: 'ownership-gap',
      category: 'Ownership gap',
      explanation: `${waitingEvents.length} event${waitingEvents.length === 1 ? '' : 's'} are waiting on ownership, assignment, or people context.`,
      severity: waitingEvents.length >= 3 ? 'high' : 'moderate',
      affectedDepartments: unique(waitingEvents.flatMap(departmentsFor)),
      unresolvedCount: waitingEvents.reduce((total, event) => total + event.unresolvedCount, 0),
      linkedEvents: waitingEvents.map((event) => event.id),
    })
  }

  if (staleEvents.length > 0) {
    reasons.push({
      id: 'continuity-staleness',
      category: 'Continuity drift',
      explanation: `${staleEvents.length} operational area${staleEvents.length === 1 ? '' : 's'} have stale continuity and need fresh confirmation.`,
      severity: staleEvents.some((event) => event.unresolvedCount > 0) ? 'high' : 'moderate',
      affectedDepartments: unique(staleEvents.flatMap(departmentsFor)),
      unresolvedCount: staleEvents.reduce((total, event) => total + event.unresolvedCount, 0),
      linkedEvents: staleEvents.map((event) => event.id),
    })
  }

  if (reasons.length === 0) {
    reasons.push({
      id: 'stable-field',
      category: 'Stable operating picture',
      explanation: events.length > 0 ? 'No blocker-level pressure is derived from the current event sequence.' : 'No operational events are available for pressure reasoning yet.',
      severity: 'low',
      affectedDepartments: departments,
      unresolvedCount: 0,
      linkedEvents: events.map((event) => event.id),
    })
  }

  return reasons.sort((a, b) => pressureScore(b.severity) - pressureScore(a.severity))
}

export function deriveContinuityDrift(events: OperationalCalendarEvent[], dayKey: string): ContinuityDriftAnalysis {
  const dayEvents = events.filter((event) => dayKeyFor(event.timestamp) === dayKey)
  const staleItems = dayEvents.filter((event) => event.continuityState === 'stale').map((event) => event.title)
  const agingItems = dayEvents.filter((event) => event.continuityState === 'aging').map((event) => event.title)
  const missingOwnership = dayEvents.filter((event) => event.people.length === 0).map((event) => event.title)
  const unresolvedAge = dayEvents.reduce((total, event) => total + (event.continuityState === 'stale' ? event.unresolvedCount + 3 : event.continuityState === 'aging' ? event.unresolvedCount + 1 : event.unresolvedCount), 0)
  const touchedDepartments = unique(dayEvents.flatMap(departmentsFor))
  const allDepartments = unique(events.flatMap(departmentsFor))
  const untouchedAreas = allDepartments.filter((department) => !touchedDepartments.includes(department)).slice(0, 5)

  const driftLevel: ContinuityDriftLevel =
    staleItems.length > 0 && unresolvedAge >= 3
      ? 'critical'
      : staleItems.length > 0
        ? 'stale'
        : agingItems.length > 0 || missingOwnership.length > 1
          ? 'aging'
          : 'stable'

  const operationalRiskSummary =
    driftLevel === 'critical'
      ? 'Stale continuity is attached to unresolved operational pressure.'
      : driftLevel === 'stale'
        ? 'Continuity needs a fresh update before the day can be trusted.'
        : driftLevel === 'aging'
          ? 'Some ownership or update signals are aging.'
          : dayEvents.length > 0
            ? 'Continuity is currently stable for the selected day.'
            : 'No day-specific continuity has been derived yet.'

  return {
    dayKey,
    driftLevel,
    staleItems,
    untouchedAreas,
    unresolvedAge,
    missingOwnership,
    operationalRiskSummary,
  }
}

export function deriveDependencies(events: OperationalCalendarEvent[]): OperationalDependency[] {
  const sorted = [...events].sort((a, b) => eventTime(a) - eventTime(b))
  const dependencies: OperationalDependency[] = []

  for (let index = 0; index < sorted.length - 1; index += 1) {
    const source = sorted[index]
    const target = sorted[index + 1]
    const sharedDepartments = departmentsFor(source).filter((department) => departmentsFor(target).includes(department))
    const department = sharedDepartments[0] ?? departmentsFor(source)[0] ?? departmentsFor(target)[0] ?? 'operations'
    const status = dependencyStatus(source)
    const unresolvedImpact = source.unresolvedCount + (status === 'blocked' ? 2 : status === 'at_risk' ? 1 : 0)

    dependencies.push({
      id: `dependency-${source.id}-${target.id}`,
      sourceEventId: source.id,
      targetEventId: target.id,
      department,
      dependencyReason: `${source.title} informs readiness for ${target.title}.`,
      status,
      unresolvedImpact,
      operationalRisk: eventRisk(source),
    })
  }

  return dependencies.sort((a, b) => {
    const impactDelta = b.unresolvedImpact - a.unresolvedImpact
    if (impactDelta !== 0) return impactDelta
    return pressureScore(b.operationalRisk) - pressureScore(a.operationalRisk)
  })
}

export function buildReasoningSummary(events: OperationalCalendarEvent[], dayKey: string): OperationalReasoningSummary {
  const pressureReasons = deriveOperationalPressure(events)
  const drift = deriveContinuityDrift(events, dayKey)
  const dependencies = deriveDependencies(events)
  const mostBlockedDepartment = getMostBlockedDepartment(events)
  const highestPressureEvent = getHighestPressureEvent(events)
  const oldestUnresolvedItem = getOldestUnresolvedItem(events)
  const keyDependency = dependencies[0]

  const recommendedFocus = oldestUnresolvedItem
    ? `Clarify ${oldestUnresolvedItem.title} before pressure propagates.`
    : keyDependency
      ? `Watch ${keyDependency.department} because ${keyDependency.dependencyReason.toLowerCase()}`
      : highestPressureEvent
        ? `Keep ${highestPressureEvent.title} in view as the highest current pressure signal.`
        : 'Hold the current operating picture until new continuity arrives.'

  return {
    pressureReasons,
    drift,
    dependencies,
    mostBlockedDepartment,
    highestPressureEvent,
    oldestUnresolvedItem,
    recommendedFocus,
    keyDependency,
  }
}
