import type {
  CompatibilityReport,
  ProductionRider,
  RequirementCompatibility,
  VenueAssessment,
  VenueEntity,
  VenueIssue,
} from './types'

function compact(strings: Array<string | undefined | null | false>) {
  return strings.filter(Boolean) as string[]
}

function unique(strings: string[]) {
  return Array.from(new Set(strings.map((item) => item.trim()).filter(Boolean)))
}

function venueEvidenceIndex(venue: VenueEntity) {
  const entries: Array<[string, string[]]> = [
    ['audio', venue.audio.available],
    ['lighting', venue.lighting.available],
    ['video', venue.video.available],
    ['rigging', compact([
      venue.rigging.pointsCount ? `${venue.rigging.pointsCount} rigging points` : undefined,
      venue.rigging.maxPointLoadLbs ? `${venue.rigging.maxPointLoadLbs} lb point load` : undefined,
      ...venue.rigging.notes,
    ])],
    ['power', compact([
      ...venue.power.services,
      venue.power.shorePowerAvailable !== undefined
        ? venue.power.shorePowerAvailable ? 'shore power available' : 'shore power unavailable'
        : undefined,
      ...venue.power.notes,
    ])],
    ['stage', compact([
      venue.stage.widthFt ? `${venue.stage.widthFt} ft width` : undefined,
      venue.stage.depthFt ? `${venue.stage.depthFt} ft depth` : undefined,
      venue.stage.heightFt ? `${venue.stage.heightFt} ft height` : undefined,
      venue.stage.trimFt ? `${venue.stage.trimFt} ft trim` : undefined,
    ])],
    ['loading', compact([
      venue.loading.dockCount !== undefined ? `${venue.loading.dockCount} docks` : undefined,
      venue.loading.driveInAccess !== undefined
        ? venue.loading.driveInAccess ? 'drive-in access' : 'no drive-in access'
        : undefined,
      ...venue.loading.truckAccessNotes,
    ])],
    ['communications', venue.communications.available],
    ['hospitality', venue.hospitality.available],
    ['restrictions', venue.restrictions.map((item) => `${item.category}: ${item.detail}`)],
    ['general', venue.rawFacts],
  ]

  return entries.map(([bucket, values]) => ({
    bucket,
    haystack: values.join(' ').toLowerCase(),
    evidence: values,
  }))
}

function compareRequirement(
  venue: VenueEntity,
  requirement: ProductionRider['requirements'][number],
): RequirementCompatibility {
  const index = venueEvidenceIndex(venue)
  const matches = index.flatMap((bucket) => {
    const matchedKeywords = requirement.keywords.filter((keyword) => bucket.haystack.includes(keyword))
    if (matchedKeywords.length === 0) return []
    return bucket.evidence
      .filter((evidence) => matchedKeywords.some((keyword) => evidence.toLowerCase().includes(keyword)))
      .slice(0, 3)
  })

  let status: RequirementCompatibility['status'] = 'unknown'
  let confidence = 0.25

  if (matches.length >= 2) {
    status = 'supported'
    confidence = 0.9
  } else if (matches.length === 1) {
    status = 'partial'
    confidence = 0.65
  }

  const lower = `${requirement.department} ${requirement.title} ${requirement.detail}`.toLowerCase()

  if (/rigging/.test(lower) && venue.rigging.pointsCount === undefined) {
    status = 'unknown'
    confidence = 0.3
  }

  if (/power/.test(lower) && venue.power.services.length === 0) {
    status = 'missing'
    confidence = 0.85
  }

  if (/truck|bus|fleet|loading|dock/.test(lower) && venue.loading.dockCount === undefined && venue.loading.driveInAccess === undefined) {
    status = 'missing'
    confidence = 0.8
  }

  return {
    requirementId: requirement.id,
    department: requirement.department,
    title: requirement.title,
    detail: requirement.detail,
    status,
    confidence,
    evidence: unique(matches),
    issue: status === 'supported'
      ? undefined
      : status === 'partial'
        ? 'Venue packet suggests partial support but the requirement is not fully confirmed.'
        : status === 'missing'
          ? 'No supporting venue capability was found for this rider requirement.'
          : 'Venue packet does not provide enough evidence to confirm this rider requirement.',
  }
}

function severityForResult(result: RequirementCompatibility, priority: 'critical' | 'high' | 'medium'): VenueIssue['severity'] {
  if (result.status === 'partial') {
    return priority === 'critical' ? 'high' : priority === 'high' ? 'medium' : 'low'
  }
  if (result.status === 'missing') return priority
  return priority === 'critical' ? 'high' : 'medium'
}

function scoreReport(results: RequirementCompatibility[]) {
  let score = 100

  for (const result of results) {
    if (result.status === 'supported') continue
    if (result.status === 'partial') score -= 10
    else if (result.status === 'unknown') score -= 14
    else score -= 22
  }

  return Math.max(0, Math.min(100, score))
}

export function buildVenueAssessment(input: {
  workspaceId: string
  venue: VenueEntity
  rider: ProductionRider
  createdAt?: string
}): VenueAssessment {
  const results = input.rider.requirements.map((requirement) => compareRequirement(input.venue, requirement))
  const requirementsById = new Map(input.rider.requirements.map((item) => [item.id, item]))
  const openIssues: VenueIssue[] = results
    .filter((result) => result.status !== 'supported')
    .map((result) => {
      const requirement = requirementsById.get(result.requirementId)
      return {
        id: `issue:${result.requirementId}`,
        title: `${result.department}: ${result.title}`,
        detail: result.issue ?? 'Follow up with venue operations.',
        severity: severityForResult(result, requirement?.priority ?? 'medium'),
        department: result.department,
        requirementId: result.requirementId,
      }
    })

  const supportedCount = results.filter((result) => result.status === 'supported').length
  const partialCount = results.filter((result) => result.status === 'partial').length
  const missingCount = results.filter((result) => result.status === 'missing').length
  const unknownCount = results.filter((result) => result.status === 'unknown').length
  const readinessScore = scoreReport(results)

  const reportStatus: CompatibilityReport['status'] =
    missingCount > 0 || readinessScore < 55 ? 'risk' : partialCount > 0 || unknownCount > 0 ? 'watch' : 'ready'

  const summary = reportStatus === 'ready'
    ? 'Venue packet aligns cleanly with the active rider.'
    : reportStatus === 'watch'
      ? 'Venue packet covers part of the rider, but key confirmations are still open.'
      : 'Venue packet leaves material rider gaps that should be resolved before load-in.'

  const createdAt = input.createdAt ?? new Date().toISOString()

  return {
    id: `assessment:${input.venue.id}:${input.rider.id}`,
    workspaceId: input.workspaceId,
    venueId: input.venue.id,
    riderId: input.rider.id,
    venueProfile: {
      title: `${input.venue.name} Venue Profile`,
      summary: input.venue.profileSummary,
      highlights: unique(compact([
        input.venue.location ? `Location: ${input.venue.location}` : undefined,
        input.venue.stage.widthFt && input.venue.stage.depthFt
          ? `Stage: ${input.venue.stage.widthFt}ft x ${input.venue.stage.depthFt}ft`
          : undefined,
        input.venue.loading.dockCount !== undefined ? `Docks: ${input.venue.loading.dockCount}` : undefined,
        input.venue.rigging.pointsCount !== undefined ? `Rigging points: ${input.venue.rigging.pointsCount}` : undefined,
        input.venue.power.services[0],
      ])),
    },
    compatibilityReport: {
      status: reportStatus,
      summary,
      supportedCount,
      partialCount,
      missingCount,
      unknownCount,
      requirementResults: results,
    },
    openIssues,
    readinessScore,
    createdAt,
    updatedAt: createdAt,
  }
}
