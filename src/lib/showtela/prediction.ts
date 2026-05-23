import type { OperationalCalendarEvent } from './calendar'
import { deriveDependencies } from './reasoning'

export type OperationalRiskLevel = 'stable' | 'watch' | 'elevated' | 'high' | 'critical'

export type ContinuityWatchState = 'healthy' | 'aging' | 'drifting' | 'unstable'

export type DepartmentLoadState = 'balanced' | 'active' | 'compressed' | 'overloaded'

export interface OperationalPrediction {
  id: string
  predictionType: string
  riskLevel: OperationalRiskLevel
  affectedDepartments: string[]
  affectedEvents: string[]
  predictionReason: string
  likelihood: number
  operationalImpact: string
  recommendedFocus: string
  continuityFactors: string[]
  timestamp: string
}

export interface ContinuityWatchAnalysis {
  dayKey: string
  watchState: ContinuityWatchState
  unresolvedTrend: number
  continuityDecay: number
  operationalSilence: string[]
  staleOwnership: string[]
  blockedDependencies: string[]
  upcomingRisk: string[]
  recommendation: string
}

export interface DepartmentLoadAnalysis {
  department: string
  loadState: DepartmentLoadState
  eventCount: number
  unresolvedCount: number
  dependencyPressure: number
  staffingRisk: OperationalRiskLevel
  readinessRisk: OperationalRiskLevel
  compressionRisk: OperationalRiskLevel
}

function dayKeyFor(value: string) {
  return value.slice(0, 10)
}

function eventTime(event: OperationalCalendarEvent) {
  return new Date(event.timestamp).getTime()
}

function departmentsFor(event: OperationalCalendarEvent) {
  return event.departments.length ? event.departments : [event.type]
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
}

function riskWeight(level: OperationalRiskLevel) {
  if (level === 'critical') return 5
  if (level === 'high') return 4
  if (level === 'elevated') return 3
  if (level === 'watch') return 2
  return 1
}

function riskFromScore(score: number): OperationalRiskLevel {
  if (score >= 10) return 'critical'
  if (score >= 7) return 'high'
  if (score >= 4) return 'elevated'
  if (score >= 2) return 'watch'
  return 'stable'
}

function maxRisk(levels: OperationalRiskLevel[]) {
  return levels.sort((a, b) => riskWeight(b) - riskWeight(a))[0] ?? 'stable'
}

function likelihoodFromRisk(level: OperationalRiskLevel) {
  if (level === 'critical') return 0.86
  if (level === 'high') return 0.72
  if (level === 'elevated') return 0.58
  if (level === 'watch') return 0.38
  return 0.18
}

function loadStateFromScore(score: number): DepartmentLoadState {
  if (score >= 10) return 'overloaded'
  if (score >= 6) return 'compressed'
  if (score >= 2) return 'active'
  return 'balanced'
}

function riskForEvent(event: OperationalCalendarEvent): OperationalRiskLevel {
  const pressureScore =
    event.pressureState === 'critical' ? 6 :
      event.pressureState === 'needs_decision' ? 5 :
        event.pressureState === 'pressure' ? 4 :
          event.pressureState === 'tela_ready' || event.pressureState === 'waiting' ? 2 : 0
  const continuityScore = event.continuityState === 'stale' ? 3 : event.continuityState === 'aging' ? 2 : 0
  const ownershipScore = event.people.length === 0 ? 2 : 0
  return riskFromScore(pressureScore + continuityScore + ownershipScore + event.unresolvedCount)
}

function labelForEvent(events: OperationalCalendarEvent[], id: string) {
  return events.find((event) => event.id === id)?.title ?? id
}

export function detectTimelineCompression(events: OperationalCalendarEvent[]) {
  const sorted = [...events].sort((a, b) => eventTime(a) - eventTime(b))
  const compressed: Array<{ source: OperationalCalendarEvent; target: OperationalCalendarEvent; gapHours: number }> = []

  for (let index = 0; index < sorted.length - 1; index += 1) {
    const source = sorted[index]
    const target = sorted[index + 1]
    const sharedDepartment = departmentsFor(source).some((department) => departmentsFor(target).includes(department))
    const gapHours = Math.max(0, (eventTime(target) - eventTime(source)) / 3_600_000)
    if (sharedDepartment && gapHours <= 6) {
      compressed.push({ source, target, gapHours })
    }
  }

  return compressed
}

export function detectOperationalSilence(events: OperationalCalendarEvent[], dayKey: string) {
  const dayEvents = events.filter((event) => dayKeyFor(event.timestamp) === dayKey)
  const allDepartments = unique(events.flatMap(departmentsFor))
  const activeDepartments = unique(dayEvents.flatMap(departmentsFor))
  const staleDepartments = unique(dayEvents.filter((event) => event.continuityState === 'stale' || event.continuityState === 'unknown').flatMap(departmentsFor))
  return unique([...allDepartments.filter((department) => !activeDepartments.includes(department)), ...staleDepartments]).slice(0, 6)
}

export function detectEscalatingRisk(events: OperationalCalendarEvent[]) {
  return events
    .filter((event) => event.unresolvedCount > 0 || event.continuityState === 'stale' || ['critical', 'needs_decision', 'pressure'].includes(event.pressureState))
    .sort((a, b) => riskWeight(riskForEvent(b)) - riskWeight(riskForEvent(a)) || b.unresolvedCount - a.unresolvedCount)
}

export function detectDependencyPropagation(events: OperationalCalendarEvent[], dependencies = deriveDependencies(events)) {
  return dependencies.filter((dependency) => dependency.status === 'blocked' || dependency.status === 'at_risk' || dependency.unresolvedImpact > 0)
}

export function deriveDepartmentLoad(events: OperationalCalendarEvent[], dependencies = deriveDependencies(events)): DepartmentLoadAnalysis[] {
  const departments = unique(events.flatMap(departmentsFor))

  return departments.map((department) => {
    const departmentEvents = events.filter((event) => departmentsFor(event).includes(department))
    const departmentDependencies = dependencies.filter((dependency) => dependency.department === department)
    const unresolvedCount = departmentEvents.reduce((total, event) => total + event.unresolvedCount, 0)
    const dependencyPressure = departmentDependencies.reduce((total, dependency) => total + dependency.unresolvedImpact + (dependency.status === 'blocked' ? 2 : dependency.status === 'at_risk' ? 1 : 0), 0)
    const missingOwners = departmentEvents.filter((event) => event.people.length === 0).length
    const staleCount = departmentEvents.filter((event) => event.continuityState === 'stale').length
    const compressionCount = detectTimelineCompression(departmentEvents).length
    const loadScore = departmentEvents.length + unresolvedCount + dependencyPressure + missingOwners + staleCount + compressionCount

    return {
      department,
      loadState: loadStateFromScore(loadScore),
      eventCount: departmentEvents.length,
      unresolvedCount,
      dependencyPressure,
      staffingRisk: riskFromScore(missingOwners * 2 + departmentEvents.length - 1),
      readinessRisk: riskFromScore(unresolvedCount + staleCount * 2 + dependencyPressure),
      compressionRisk: riskFromScore(compressionCount * 3 + departmentEvents.length - 2),
    }
  }).sort((a, b) => {
    const loadRank: Record<DepartmentLoadState, number> = { overloaded: 4, compressed: 3, active: 2, balanced: 1 }
    return loadRank[b.loadState] - loadRank[a.loadState] || b.unresolvedCount - a.unresolvedCount
  })
}

export function deriveOperationalPredictions(events: OperationalCalendarEvent[], dependencies = deriveDependencies(events)): OperationalPrediction[] {
  const timestamp = new Date().toISOString()
  const predictions: OperationalPrediction[] = []
  const escalating = detectEscalatingRisk(events)
  const compressed = detectTimelineCompression(events)
  const propagation = detectDependencyPropagation(events, dependencies)
  const departmentLoad = deriveDepartmentLoad(events, dependencies)
  const overloaded = departmentLoad.filter((item) => item.loadState === 'overloaded' || item.loadState === 'compressed')

  if (escalating.length > 0) {
    const top = escalating[0]
    const riskLevel = riskForEvent(top)
    predictions.push({
      id: `prediction-escalation-${top.id}`,
      predictionType: 'Unresolved escalation',
      riskLevel,
      affectedDepartments: departmentsFor(top),
      affectedEvents: [top.id],
      predictionReason: `${top.title} is becoming risky from ${top.unresolvedCount} unresolved item${top.unresolvedCount === 1 ? '' : 's'}, ${top.pressureState} pressure, and ${top.continuityState} continuity.`,
      likelihood: likelihoodFromRisk(riskLevel),
      operationalImpact: 'Unresolved pressure may propagate into the next operational movement.',
      recommendedFocus: `Clarify ${top.title} before it becomes the pacing constraint.`,
      continuityFactors: unique([top.continuityState, top.pressureState, top.people.length === 0 ? 'missing ownership' : 'owned']),
      timestamp,
    })
  }

  if (compressed.length > 0) {
    const top = compressed[0]
    const departments = unique([...departmentsFor(top.source), ...departmentsFor(top.target)])
    const riskLevel = riskFromScore(6 - Math.min(6, top.gapHours) + top.source.unresolvedCount + top.target.unresolvedCount)
    predictions.push({
      id: `prediction-compression-${top.source.id}-${top.target.id}`,
      predictionType: 'Timeline compression',
      riskLevel,
      affectedDepartments: departments,
      affectedEvents: [top.source.id, top.target.id],
      predictionReason: `${top.source.title} and ${top.target.title} are sequenced within ${Math.round(top.gapHours)} hour${Math.round(top.gapHours) === 1 ? '' : 's'} in the same operational lane.`,
      likelihood: likelihoodFromRisk(riskLevel),
      operationalImpact: 'Readiness may tighten if upstream movement slips.',
      recommendedFocus: `Protect the handoff from ${top.source.title} into ${top.target.title}.`,
      continuityFactors: unique([top.source.continuityState, top.target.continuityState, 'tight sequence']),
      timestamp,
    })
  }

  if (propagation.length > 0) {
    const top = propagation[0]
    const riskLevel = top.status === 'blocked' ? 'critical' : top.operationalRisk === 'critical' ? 'high' : 'elevated'
    predictions.push({
      id: `prediction-propagation-${top.id}`,
      predictionType: 'Dependency propagation',
      riskLevel,
      affectedDepartments: [top.department],
      affectedEvents: [top.sourceEventId, top.targetEventId],
      predictionReason: `${labelForEvent(events, top.sourceEventId)} is upstream of ${labelForEvent(events, top.targetEventId)} with ${top.status} dependency status.`,
      likelihood: likelihoodFromRisk(riskLevel),
      operationalImpact: 'A blocked upstream item can pull pressure into the next event.',
      recommendedFocus: `Resolve the ${top.department} dependency before the next linked movement.`,
      continuityFactors: ['dependency pressure', top.status, `${top.unresolvedImpact} impact`],
      timestamp,
    })
  }

  if (overloaded.length > 0) {
    const top = overloaded[0]
    const riskLevel = top.loadState === 'overloaded' ? 'high' : 'elevated'
    predictions.push({
      id: `prediction-load-${top.department}`,
      predictionType: 'Department load',
      riskLevel,
      affectedDepartments: [top.department],
      affectedEvents: events.filter((event) => departmentsFor(event).includes(top.department)).map((event) => event.id),
      predictionReason: `${top.department} is ${top.loadState} from ${top.eventCount} event${top.eventCount === 1 ? '' : 's'}, ${top.unresolvedCount} unresolved item${top.unresolvedCount === 1 ? '' : 's'}, and ${top.dependencyPressure} dependency pressure.`,
      likelihood: likelihoodFromRisk(riskLevel),
      operationalImpact: 'Department load may become the pacing risk if not clarified.',
      recommendedFocus: `Reduce ${top.department} ambiguity before adding more movement.`,
      continuityFactors: [`${top.loadState} load`, `${top.readinessRisk} readiness`, `${top.compressionRisk} compression`],
      timestamp,
    })
  }

  if (predictions.length === 0) {
    predictions.push({
      id: 'prediction-stable-watch',
      predictionType: 'Stable watch',
      riskLevel: 'stable',
      affectedDepartments: unique(events.flatMap(departmentsFor)),
      affectedEvents: events.map((event) => event.id),
      predictionReason: events.length > 0 ? 'No escalation, compression, or dependency propagation is derived from the current sequence.' : 'No operational events are available for predictive watch yet.',
      likelihood: likelihoodFromRisk('stable'),
      operationalImpact: 'Current risk remains observational.',
      recommendedFocus: 'Keep continuity fresh and watch for unresolved state entering the timeline.',
      continuityFactors: events.length > 0 ? ['stable sequence'] : ['awaiting continuity'],
      timestamp,
    })
  }

  return predictions.sort((a, b) => riskWeight(b.riskLevel) - riskWeight(a.riskLevel) || b.likelihood - a.likelihood)
}

export function deriveContinuityWatch(events: OperationalCalendarEvent[], dayKey: string, dependencies = deriveDependencies(events)): ContinuityWatchAnalysis {
  const dayEvents = events.filter((event) => dayKeyFor(event.timestamp) === dayKey)
  const staleOwnership = dayEvents.filter((event) => event.people.length === 0).map((event) => event.title)
  const operationalSilence = detectOperationalSilence(events, dayKey)
  const blockedDependencies = detectDependencyPropagation(dayEvents, dependencies).map((dependency) => dependency.department)
  const upcomingRisk = detectEscalatingRisk(dayEvents).slice(0, 3).map((event) => event.title)
  const unresolvedTrend = dayEvents.reduce((total, event) => total + event.unresolvedCount, 0)
  const continuityDecay = dayEvents.reduce((total, event) => total + (event.continuityState === 'stale' ? 3 : event.continuityState === 'aging' ? 2 : event.continuityState === 'unknown' ? 1 : 0), 0)
  const score = unresolvedTrend + continuityDecay + staleOwnership.length + blockedDependencies.length * 2 + operationalSilence.length
  const watchState: ContinuityWatchState = score >= 10 ? 'unstable' : score >= 6 ? 'drifting' : score >= 2 ? 'aging' : 'healthy'

  const recommendation =
    watchState === 'unstable'
      ? 'Stabilize unresolved ownership and blocked dependencies before the day advances.'
      : watchState === 'drifting'
        ? 'Refresh continuity in the quiet areas before risk becomes visible.'
        : watchState === 'aging'
          ? 'Confirm ownership and update the oldest operational signals.'
          : 'Maintain the current watch; no escalation is derived yet.'

  return {
    dayKey,
    watchState,
    unresolvedTrend,
    continuityDecay,
    operationalSilence,
    staleOwnership,
    blockedDependencies: unique(blockedDependencies),
    upcomingRisk,
    recommendation,
  }
}

export function getHighestRiskDay(events: OperationalCalendarEvent[]) {
  const scores = new Map<string, number>()
  for (const event of events) {
    const key = dayKeyFor(event.timestamp)
    scores.set(key, (scores.get(key) ?? 0) + riskWeight(riskForEvent(event)) + event.unresolvedCount)
  }
  return [...scores.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
}

export function getMostCompressedDepartment(events: OperationalCalendarEvent[]) {
  const compressed = detectTimelineCompression(events)
  const counts = new Map<string, number>()
  for (const item of compressed) {
    for (const department of unique([...departmentsFor(item.source), ...departmentsFor(item.target)])) {
      counts.set(department, (counts.get(department) ?? 0) + 1)
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
}

export function getMostAtRiskEvent(events: OperationalCalendarEvent[]) {
  return [...events].sort((a, b) => riskWeight(riskForEvent(b)) - riskWeight(riskForEvent(a)) || b.unresolvedCount - a.unresolvedCount)[0]
}

export function buildPredictionSummary(events: OperationalCalendarEvent[], dayKey: string) {
  const dependencies = deriveDependencies(events)
  const predictions = deriveOperationalPredictions(events, dependencies)
  const watch = deriveContinuityWatch(events, dayKey, dependencies)
  const departmentLoad = deriveDepartmentLoad(events, dependencies)
  const highestRiskDay = getHighestRiskDay(events)
  const mostCompressedDepartment = getMostCompressedDepartment(events)
  const mostAtRiskEvent = getMostAtRiskEvent(events)

  return {
    predictions,
    watch,
    departmentLoad,
    dependencies,
    highestRiskDay,
    mostCompressedDepartment,
    mostAtRiskEvent,
    riskLevel: maxRisk(predictions.map((prediction) => prediction.riskLevel)),
  }
}
